"use strict";


/* =========================================================
   MAISON HAIR — ADMIN LOGIN
========================================================= */

const SUPABASE_URL =
    "https://upvbaagmusbrqbbcdudv.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdmJhYWdtdXNicnFiYmNkdWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDg0ODAsImV4cCI6MjEwNjE4NDQ4MH0.2H4c-v3CCT7bj5AaNRs366_cmZAb1RGg1X78WFkTndg";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
            auth: {
                flowType: "implicit",
                detectSessionInUrl: true,
                persistSession: true,
                autoRefreshToken: true
            }
        }
    );


const loginForm =
    document.getElementById("loginForm");


const loginBtn =
    document.getElementById("loginBtn");


const loginError =
    document.getElementById("loginError");
    
const forgotPasswordBtn =
    document.getElementById("forgotPasswordBtn");    


function showLoginError(message) {

    loginError.textContent =
        message;

    loginError.classList.add(
        "active"
    );

}


function clearLoginError() {

    loginError.textContent =
        "";

    loginError.classList.remove(
        "active"
    );

}


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearLoginError();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        loginBtn.disabled =
            true;

        loginBtn.textContent =
            "Signing in...";


        try {

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .signInWithPassword({
                        email,
                        password
                    });


            if (error) {
                throw error;
            }


            if (!data.session) {

                throw new Error(
                    "No authenticated session was created."
                );

            }


            /*
             * Login succeeded.
             *
             * Now check whether this user is
             * actually registered as a Maison Hair admin.
             */

            const {
                data: isAdmin,
                error: adminError
            } =
                await supabaseClient.rpc(
                    "is_maison_admin"
                );


            if (adminError) {

                console.error(
                    "[Maison] Admin check failed:",
                    adminError
                );


                await supabaseClient.auth.signOut();


                throw new Error(
                    "Unable to verify administrator access."
                );

            }


            if (!isAdmin) {

                await supabaseClient.auth.signOut();


                throw new Error(
                    "This account is not authorized to access the admin dashboard."
                );

            }


            loginBtn.textContent =
                "Opening dashboard...";


            window.location.replace(
                "admin.html"
            );


        } catch (error) {

            console.error(
                "[Maison] Login error:",
                error
            );


            showLoginError(
                error.message ||
                "Unable to sign in. Please check your details."
            );


            loginBtn.disabled =
                false;

            loginBtn.textContent =
                "Sign in";

        }

    }
);

/* =========================================================
   FORGOT PASSWORD
========================================================= */

forgotPasswordBtn.addEventListener(
    "click",
    async () => {

        clearLoginError();


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        if (!email) {

            showLoginError(
                "Enter your admin email address first."
            );

            document
                .getElementById("email")
                .focus();

            return;
        }


        forgotPasswordBtn.disabled =
            true;

        forgotPasswordBtn.textContent =
            "Sending...";


        try {

            const {
                error
            } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                `${window.location.origin}/reset-password.html`
                        }
                    );


            if (error) {
                throw error;
            }


            showLoginError(
                "Password reset instructions have been sent to your email."
            );


        } catch (error) {

            console.error(
                "[Maison] Password reset error:",
                error
            );


            showLoginError(
                error.message ||
                "Unable to send password reset instructions."
            );


        } finally {

            forgotPasswordBtn.disabled =
                false;

            forgotPasswordBtn.textContent =
                "Forgot password?";

        }

    }
);
