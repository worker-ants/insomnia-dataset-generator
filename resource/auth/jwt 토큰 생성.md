# JWT 토큰 생성
사용자의 ID, 비밀번호를 이용하여 유효성 검증 후 JWT 토큰을 생성

## Type
```text
REQUEST_CREDENTIAL
```

## Query
```text
mutation($authInput: AuthInput!) {
  newAuthToken(authInput: $authInput) {
    accessToken
    message
  }
}
```

## Variables
```text
{
  "authInput": {
    "userId": "{{ _.htUserID }}",
    "userPassword": "{{ _.htUserPassword }}"
  }
}
```