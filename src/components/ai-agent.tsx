"use client";

import { useEffect, useRef, useState } from "react";

import type { FormEventHandler, MouseEventHandler } from "react";

interface Message {
    author: "user" | "agent";
    content: string;
}

const createMessage = (author: Message["author"], content: Message["content"]) => ({
    author,
    content,
});

export default function AIAgent() {
    const inputReference = useRef<HTMLInputElement>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [prompting, setPrompting] = useState(false);
    const [identity, setIdentity] = useState(crypto.randomUUID());
    const [ended, setEnded] = useState(false);
    const baseMessageClass = "rounded-lg box-border p-2 max-w-1/2 motion-safe:animate-slide";
    const userMessageClass = "bg-base-300 mr-auto";
    const agentMessageClass = "bg-primary-content text-primary ml-auto";
    let placeholder = "Enter your prompt here";

    const onSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault();

        const message = inputReference.current?.value;

        if (prompting || message?.length === 0) {
            return;
        }

        if (inputReference.current) {
            inputReference.current.value = "";
        }

        setConversation(value => [...value, createMessage("user", message!)]);
        setPrompting(true);

        const response = await fetch(`/api/prompt`, {
            body: JSON.stringify({
                id: identity,
                prompt: message,
                requestType: conversation.length === 0 ? "launch" : "text",
            }),
            headers: {
                Accept: "text/plain",
                "Content-Type": "application/json",
            },
            method: "POST",
        });

        if (response.ok) {
            const agentsResponse = await response.text();

            console.log(typeof agentsResponse, agentsResponse);

            if (agentsResponse.length === 0) {
                setEnded(true);
            } else {
                setConversation(value => [...value, createMessage("agent", agentsResponse)]);
            }
        }

        setPrompting(false);
    };

    const resetState: MouseEventHandler<HTMLButtonElement> = () => {
        console.log("Here!");
        setConversation([]);
        setIdentity(crypto.randomUUID());
        setEnded(false);
    };

    if (prompting) {
        placeholder = "Please wait for a response...";
    } else if (ended) {
        placeholder = "This conversation has ended";
    }

    useEffect(() => {
        inputReference.current?.focus();
    }, [prompting]);

    return (
        <form className="mt-auto flex h-full w-full flex-col justify-end gap-2" onSubmit={onSubmit}>
            <ul className="flex w-full flex-col gap-2">
                {conversation.map((message, position) => (
                    <p
                        className={`${baseMessageClass} ${message.author === "user" ? userMessageClass : agentMessageClass}`}
                        key={`message-${position + 1}`}
                    >
                        {message.content}
                    </p>
                ))}

                {prompting ? (
                    <span
                        className={`loading loading-spinner text-primary motion-safe:animate-slide ml-auto py-1 transition-opacity delay-500`}
                    ></span>
                ) : null}
            </ul>

            <span
                className={
                    ended
                        ? "bg-error animate-slide box-border w-full rounded px-2 py-1 text-center select-none"
                        : "hidden"
                }
            >
                No new response from agent - this conversation has ended.{" "}
                <button
                    className="font-bold hover:cursor-pointer"
                    onClick={resetState}
                    type="button"
                >
                    Click here to try again!
                </button>
            </span>
            <input
                className={`input input-primary w-full ${prompting ? "disabled:cursor-progress" : ""}`.trimEnd()}
                disabled={prompting || ended}
                placeholder={placeholder}
                ref={inputReference}
                type="text"
            />
        </form>
    );
}
