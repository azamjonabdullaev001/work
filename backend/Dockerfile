FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY . .

RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /freelance-api ./cmd/main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /freelance-api .

RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./freelance-api"]
