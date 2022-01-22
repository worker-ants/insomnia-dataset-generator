require('dotenv').config();

exports.env = {
    INDENT: 2, // fixed
    RESOURCE_PATH: './resource',
    WORKSPACE_ID: process.env.WORKSPACE_ID ?? 'graphQL Project',
    WORKSPACE_NAME: process.env.WORKSPACE_NAME ?? 'workspace',
    WORKSPACE_DESCRIPTION: process.env.WORKSPACE_DESCRIPTION ?? '',
    ENVIRONMENT: [
        {
            NAME: 'local',
            GQL_HOST: process.env.LOCAL_GQL_HOST ?? 'http://localhost/graphql',
            HT_USER_ID: process.env.LOCAL_HT_USER_ID ?? 'user',
            HT_USER_PASSWORD: process.env.LOCAL_HT_USER_PASSWORD ?? 'password',
        },
        {
            NAME: 'staging',
            GQL_HOST: process.env.STAGING_GQL_HOST ?? 'http://localhost/graphql',
            HT_USER_ID: process.env.STAGING_HT_USER_ID ?? 'user',
            HT_USER_PASSWORD: process.env.STAGING_HT_USER_PASSWORD ?? 'password',
        },
        {
            NAME: 'production',
            GQL_HOST: process.env.PRODUCTION_GQL_HOST ?? 'http://localhost/graphql',
            HT_USER_ID: process.env.PRODUCTION_HT_USER_ID ?? 'user',
            HT_USER_PASSWORD: process.env.PRODUCTION_HT_USER_PASSWORD ?? 'password',
        },
    ],
}