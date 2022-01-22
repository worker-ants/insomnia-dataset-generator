# insomnia yaml 생성기

## 사용 방법
```text
# 환경설정
cp .env.example .env

# 패키지 설치
npm install

# 실행
num run generate
```

생성 결과물: `result/*.yaml`

## .yaml 구조
```text
 yaml root
  ㄴ workspace
      ㄴ apiSpec
      ㄴ EnvironmentBase
          ㄴ EnvironmentItem (multiple)
      ㄴ requestGroup
          ㄴ request (multiple)
          ㄴ requestGroup (nested/multiple)
              ㄴ request (multiple)
```

## API 마크다운 생성 방법
```text
`./resource` 하위에 기술합니다.

디렉토리는 `insomnia`의 `folder`로 변환되며,
`.md`는 `insomnia`의 `request`로 변환됩니다.

`.md`는 `./template.md`을 복사하여 사용해 주세요.
(Query,Variables 파싱을 위한 구조 제약이 존재합니다.) 
```

### 참고: 마크다운 파싱 정규식

| label     | regxp                                                    |
|-----------|----------------------------------------------------------|
| 제목        | `/^#[\s\t]+(.+)$/m`                                      |
| API 유형    | `/##[\s\t]*Type[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims`      |
| Query     | `/##[\s\t]*Query[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims`     |
| variables | `/##[\s\t]*Variables[\s\t\r\n]+```[^\n]*\n(.+)\n```/ims` |

* `API 유형`은 환경변수나 다른 API 등에서 사용하기 위해 `request ID`가 강제되어야 할 경우 사용됩니다.
  * `credential` 생성
  * 선행 API