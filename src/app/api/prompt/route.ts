import { z as zod } from "zod";

import environment from "~/server/environment";
import logging from "~/server/logging";

interface TextTrace {
    payload: {
        message: string;
    };
    type: "end" | "text";
}

interface EndTrace {
    payload: {
        reason: string;
    };
    type: "end";
}

type VoiceflowTrace = TextTrace | EndTrace;
type VoiceflowPayload = VoiceflowTrace[];

const PAYLOAD_SCHEMA = zod.strictObject({
    id: zod.uuid(),
    prompt: zod.string().min(1),
    requestType: zod.enum(["launch", "text"]),
});

const extractResponseMessage = (payload: VoiceflowPayload): string | undefined =>
    (payload.find(trace => trace.type === "text") as TextTrace | undefined)?.payload?.message;

const extractEndingTrace = (payload: VoiceflowPayload): EndTrace | undefined =>
    payload.find(trace => trace.type === "end") as EndTrace | undefined;

export async function POST(request: Request) {
    let payload: Partial<zod.infer<typeof PAYLOAD_SCHEMA>> = await request.json();

    try {
        payload = await PAYLOAD_SCHEMA.parseAsync(payload);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            logging.log(error.message);

            return new Response(error.message, {
                status: 401,
            });
        } else if (error instanceof Error) {
            logging.log(error.stack);

            return new Response(error.message, {
                status: 500,
            });
        }
    }

    const voiceflowResponse = await fetch(
        `https://general-runtime.voiceflow.com/state/user/${payload.id}/interact`,
        {
            body: JSON.stringify({
                request: {
                    payload: payload.prompt,
                    type: payload.requestType,
                },
            }),
            headers: {
                Accept: "application/json",
                Authorization: environment.VOICEFLOW_API_KEY,
                "Content-Type": "application/json",
                versionID: environment.VOICEFLOW_VERSION_ID,
            },
            method: "POST",
        },
    );

    if (!voiceflowResponse.ok) {
        const message = `Encountered error with Voiceflow: ${voiceflowResponse.statusText}`;

        logging.log(message);

        return new Response(message, {
            status: voiceflowResponse.status,
        });
    }

    const voiceflowPayload: VoiceflowPayload = await voiceflowResponse.json();
    const voiceflowResponseFound = extractResponseMessage(voiceflowPayload);

    if (!voiceflowResponseFound) {
        const endingTraceFound = extractEndingTrace(voiceflowPayload);

        if (!endingTraceFound) {
            const message = `Unable to parse Voiceflow payload: ${JSON.stringify(voiceflowPayload)}`;

            logging.log(message);

            return new Response(message, {
                status: 500,
            });
        }

        logging.log(
            `Voiceflow conversation ended with ${payload.id}: ${endingTraceFound.payload.reason}`,
        );

        return new Response();
    }

    if (payload.requestType === "launch") {
        logging.log(`Voiceflow conversation started with ${payload.id}`);
    }

    return new Response(voiceflowResponseFound);
}
