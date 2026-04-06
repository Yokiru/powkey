"use client";

import { useActionState, useState } from "react";

import {
  signInReseller,
  signUpReseller,
  type ResellerAuthState
} from "@/app/reseller/actions";

const initialState: ResellerAuthState = {
  error: null,
  success: null
};

export function ResellerAuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signinState, signinAction, signinPending] = useActionState(
    signInReseller,
    initialState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUpReseller,
    initialState
  );

  const state = mode === "signin" ? signinState : signupState;
  const pending = mode === "signin" ? signinPending : signupPending;

  return (
    <section className="reseller-shell">
      <div className="reseller-login">
        <div className="reseller-login__panel">
          <div className="reseller-login__header">
            <span>
              {mode === "signin" ? "Portal Login" : "Pendaftaran Reseller"}
            </span>
            <strong>
              {mode === "signin"
                ? "Masuk ke akun Anda."
                : "Daftar akun reseller baru."}
            </strong>
            <p className="reseller-login__text">
              {mode === "signin"
                ? "Gunakan email dan password untuk masuk sebagai admin atau reseller."
                : "Setelah daftar, akun akan menunggu persetujuan admin sebelum bisa mengakses harga reseller."}
            </p>
          </div>

          <div className="reseller-auth-switch">
            <button
              type="button"
              className={`reseller-auth-switch__button ${mode === "signin" ? "reseller-auth-switch__button--active" : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`reseller-auth-switch__button ${mode === "signup" ? "reseller-auth-switch__button--active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>

          {mode === "signin" ? (
            <form action={signinAction} className="payment-form">
              <label className="payment-form__field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="email akun"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="payment-form__field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="password"
                  autoComplete="current-password"
                  required
                />
              </label>

              {state.error ? (
                <p className="reseller-login__error">{state.error}</p>
              ) : null}

              <button
                type="submit"
                className="product-card__buy-button"
                disabled={pending}
              >
                {pending ? "Memproses..." : "Masuk"}
              </button>
            </form>
          ) : (
            <form action={signupAction} className="payment-form">
              <label className="payment-form__field">
                <span>Nama Lengkap</span>
                <input
                  name="fullName"
                  type="text"
                  placeholder="nama lengkap"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="payment-form__field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  placeholder="email aktif"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="payment-form__field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  placeholder="buat password"
                  autoComplete="new-password"
                  required
                />
              </label>

              {state.error ? (
                <p className="reseller-login__error">{state.error}</p>
              ) : null}

              {state.success ? (
                <p className="reseller-login__success">{state.success}</p>
              ) : null}

              <button
                type="submit"
                className="product-card__buy-button"
                disabled={pending}
              >
                {pending ? "Memproses..." : "Daftar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
