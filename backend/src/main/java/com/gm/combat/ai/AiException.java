package com.gm.combat.ai;

/** Checked exception thrown by {@link AiProvider} implementations. */
public class AiException extends Exception {

    public AiException(String message) {
        super(message);
    }

    public AiException(String message, Throwable cause) {
        super(message, cause);
    }
}
