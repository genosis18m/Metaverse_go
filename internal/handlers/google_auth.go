package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/genosis18m/Metaverse_go/internal/database"
	"github.com/genosis18m/Metaverse_go/internal/models"
	"github.com/genosis18m/Metaverse_go/internal/utils"
	"github.com/gin-gonic/gin"
)

// GoogleUserInfo represents user info from Google
type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// GoogleAuthURL returns the Google OAuth URL for frontend redirect
func GoogleAuthURL(c *gin.Context) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	authURL := fmt.Sprintf(
		"https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=email%%20profile&access_type=offline",
		clientID,
		url.QueryEscape(redirectURL),
	)

	c.JSON(http.StatusOK, gin.H{"url": authURL})
}

// GoogleCallback handles the OAuth callback from Google
func GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173?error=no_code")
		return
	}

	// Exchange code for token
	token, err := exchangeCodeForToken(code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173?error=token_exchange_failed")
		return
	}

	// Get user info from Google
	userInfo, err := getGoogleUserInfo(token)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173?error=user_info_failed")
		return
	}

	// Find or create user
	var user models.User
	result := database.GetDB().Where("username = ?", userInfo.Email).First(&user)

	if result.Error != nil {
		// Create new user with Google account
		user = models.User{
			ID:       utils.GenerateCUID(),
			Username: userInfo.Email,
			Password: "", // No password for OAuth users
			Role:     "User",
		}
		if err := database.GetDB().Create(&user).Error; err != nil {
			c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173?error=user_creation_failed")
			return
		}
	}

	// Generate JWT token
	jwtToken, err := utils.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, "http://localhost:5173?error=jwt_generation_failed")
		return
	}

	// Redirect to frontend with token
	redirectURL := fmt.Sprintf("http://localhost:5173/oauth-callback?token=%s&userId=%s", jwtToken, user.ID)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func exchangeCodeForToken(code string) (string, error) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")

	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("redirect_uri", redirectURL)
	data.Set("grant_type", "authorization_code")

	resp, err := http.Post(
		"https://oauth2.googleapis.com/token",
		"application/x-www-form-urlencoded",
		strings.NewReader(data.Encode()),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", err
	}

	if tokenResp.Error != "" {
		return "", fmt.Errorf("token error: %s", tokenResp.Error)
	}

	return tokenResp.AccessToken, nil
}

func getGoogleUserInfo(accessToken string) (*GoogleUserInfo, error) {
	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo GoogleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}
