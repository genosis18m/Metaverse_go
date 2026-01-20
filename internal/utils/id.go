package utils

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateCUID generates a random CUID-like identifier
// This matches the format used by Prisma's @default(cuid())
func GenerateCUID() string {
	b := make([]byte, 20) // 20 bytes = 27 base64 chars
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)[:25]
}

// GenerateRandomString generates a random string of specified length
func GenerateRandomString(length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	rand.Read(b)
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b)
}
