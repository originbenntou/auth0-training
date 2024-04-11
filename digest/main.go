package main

import (
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/icholy/digest"
)

func main() {
	client := &http.Client{
		Transport: &digest.Transport{
			Username: os.Getenv("username"),
			Password: os.Getenv("password"),
		},
	}
	res, err := client.Get(os.Getenv("url"))
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	b, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(b))
}
