declare global {
    namespace NodeJS {
        interface ProcessEnv {
            REDIS_URL: string;
            REDIS_TOKEN: string;
            DEEPL_KEY: string;
        }
    }
}

export {}