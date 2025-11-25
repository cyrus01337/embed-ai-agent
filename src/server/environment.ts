import process from "process";

import { createEnv } from "@t3-oss/env-core";
import { z as zod } from "zod";

export default createEnv({
    client: {},
    clientPrefix: "NEXT_PUBLIC_",
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
    server: {
        VOICEFLOW_API_KEY: zod.string().min(1),
        VOICEFLOW_ENDPOINT: zod.url(),
        VOICEFLOW_VERSION_ID: zod.enum(["development", "production"]),
    },
});
