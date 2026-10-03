"use strict";

/* =========================================================
   MAISON HAIR — ADMIN DASHBOARD (STABILIZED BUILD)
   ------------------------------------------------------------
   Backend connection UNTOUCHED:
   - Same Supabase URL / anon key
   - Same tables: appointments, payments, services
   - Same RPCs: confirm_appointment, cancel_appointment,
     record_payment, clear_dashboard_data, delete_appointment
   ------------------------------------------------------------
   What this build adds:
   - Crash-proof startup (missing DOM nodes / dead CDN)
   - Stale-response protection + single in-flight loader
   - Automatic retry on network failure
   - Button locks so nothing can be double-submitted
   - Toast notifications instead of silent failures
   - Online / offline detection with auto-resync
   - Defensive date / money / time formatting (no more NaN/undefined)
   - Realtime channel auto-reconnect
   - Resync when the tab returns to the foreground
========================================================= */


/* =========================================================
   0. ENVIRONMENT GUARDS
========================================================= */

(function ensureSupabaseLoaded() {

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        window.addEventListener("DOMContentLoaded", () => {

            showFatal(
                "The Supabase library could not be loaded. " +
                "Check your internet connection and refresh the page."
            );

        });

        throw new Error(
            "[Maison] Supabase client library unavailable"
        );
    }

})();


const SUPABASE_URL =
    "https://upvbaagmusbrqbbcdudv.supabase.co";

const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdmJhYWdtdXNicnFiYmNkdWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDg0ODAsImV4cCI6MjEwNjE4NDQ4MH0.2H4c-v3CCT7bj5AaNRs366_cmZAb1RGg1X78WFkTndg";

let supabaseClient = null;

try {

    supabaseClient = supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

} catch (initError) {

    console.error(
        "[Maison] Supabase client init failed:",
        initError
    );

    window.addEventListener("DOMContentLoaded", () => {

        showFatal(
            "Could not initialize the database connection. " +
            "Please refresh the page."
        );

    });

    throw initError;
}

async function requireAdminSession() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();


    if (error || !session) {

        window.location.replace("login.html");

        return false;
    }


    const {
        data: isAdmin,
        error: adminError
    } = await supabaseClient.rpc(
        "is_maison_admin"
    );


    if (adminError || !isAdmin) {

        await supabaseClient.auth.signOut();

        window.location.replace("login.html");

        return false;
    }


    return true;
}

/* =========================================================
   1. SAFE DOM + EVENT HELPERS
========================================================= */

/**
 * getElementById that never throws.
 * Every element access in this file goes through this.
 */
const $ = (id) => document.getElementById(id);

/**
 * addEventListener that silently no-ops on missing elements,
 * so one absent node can never kill the whole script.
 */
const on = (target, eventName, handler, options) => {

    if (
        target &&
        typeof target.addEventListener === "function"
    ) {

        target.addEventListener(
            eventName,
            handler,
            options
        );

    }

};

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

function debounce(fn, delay = 200) {

    let timer = null;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(
            () => fn(...args),
            delay
        );

    };

}


/* =========================================================
   2. ELEMENT REFERENCES
========================================================= */

const pageTitle = $("pageTitle");

const navLinks =
    document.querySelectorAll(".nav-link");

const sections =
    document.querySelectorAll(".dashboard-section");

const overviewSection = $("overviewSection");

const appointmentsSection = $("appointmentsSection");

const paymentsSection = $("paymentsSection");

const recentAppointmentsTable =
    $("recentAppointmentsTable");

const appointmentsTable = $("appointmentsTable");

const paymentsTable = $("paymentsTable");

const adminProfile = $("adminProfile");

const profileCard = $("profileCard");

const clearDataBtn = $("clearDataBtn");

const logoutBtn = $("logoutBtn");

const appointmentActionMenu =
    $("appointmentActionMenu");

const deleteAppointmentBtn =
    $("deleteAppointmentBtn");

const whatsappModal = $("whatsappModal");

const whatsappModalClose =
    $("whatsappModalClose");

const whatsappCancelBtn =
    $("whatsappCancelBtn");

const whatsappSendBtn =
    $("whatsappSendBtn");

const whatsappModalTitle =
    $("whatsappModalTitle");

const whatsappModalDescription =
    $("whatsappModalDescription");

const whatsappMessagePreview =
    $("whatsappMessagePreview");


/* ---------- OVERVIEW STATS ---------- */

const todayCount = $("todayCount");

const pendingCount = $("pendingCount");

const weekCount = $("weekCount");

const revenue = $("revenue");


/* ---------- PAYMENT STATS ---------- */

const totalCollected = $("totalCollected");

const todayRevenue = $("todayRevenue");

const outstandingAmount = $("outstandingAmount");

const paidAppointments = $("paidAppointments");


/* ---------- CHART ---------- */

const revenueChart = $("revenueChart");

const chartGrid = $("chartGrid");

const chartArea = $("chartArea");

const chartLine = $("chartLine");

const chartDots = $("chartDots");

const chartLabels = $("chartLabels");

const chartTooltip = $("chartTooltip");

const chartEmpty = $("chartEmpty");

const chartCard =
    document.querySelector(".chart-card");

const chartRange = $("chartRange");

const chartRangeButtons =
    document.querySelectorAll(".chart-range-btn");


/* ---------- CONTROLS ---------- */

const refreshBtn = $("refreshBtn");

const viewAllAppointments =
    $("viewAllAppointments");

const appointmentSearch = $("appointmentSearch");

const filterButtons =
    document.querySelectorAll(".filter-btn");


/* ---------- APPOINTMENT MODAL ---------- */

const appointmentModal = $("appointmentModal");

const closeModal = $("closeModal");

const modalCustomerName = $("modalCustomerName");

const modalPhone = $("modalPhone");

const modalService = $("modalService");

const modalPrice = $("modalPrice");

const modalDate = $("modalDate");

const modalTime = $("modalTime");

const modalStatus = $("modalStatus");

const modalPaymentStatus = $("modalPaymentStatus");

const modalAmountPaid = $("modalAmountPaid");

const modalAmountRemaining =
    $("modalAmountRemaining");

const modalCreatedAt = $("modalCreatedAt");

const modalNotes = $("modalNotes");

const confirmAppointmentBtn =
    $("confirmAppointmentBtn");

const cancelAppointmentBtn =
    $("cancelAppointmentBtn");


/* ---------- PAYMENT SUMMARY ---------- */

const paymentTotal = $("paymentTotal");

const paymentPaid = $("paymentPaid");

const paymentRemaining = $("paymentRemaining");

const recordPaymentBtn = $("recordPaymentBtn");


/* ---------- PAYMENT MODAL ---------- */

const paymentModal = $("paymentModal");

const closePaymentModal = $("closePaymentModal");

const paymentCustomerName =
    $("paymentCustomerName");

const paymentAmount = $("paymentAmount");

const paymentMethod = $("paymentMethod");

const currentPaidPreview =
    $("currentPaidPreview");

const afterPaymentPreview =
    $("afterPaymentPreview");

const afterPaymentRemaining =
    $("afterPaymentRemaining");

const savePaymentBtn = $("savePaymentBtn");


/* =========================================================
   3. NOTIFICATIONS (TOASTS + FATAL BANNER)
========================================================= */

/**
 * Non-blocking toast. Falls back to console if the
 * container is missing (e.g. HTML snippet not added yet).
 */
function toast(
    message,
    type = "error",
    duration = 4200
) {

    const container = $("toastContainer");

    if (!container) {

        console.warn(
            "[Maison]",
            message
        );

        return;
    }


    const element =
        document.createElement("div");


    element.className =
        `app-toast app-toast--${type}`;

    element.setAttribute(
        "role",
        "status"
    );


    element.textContent =
        String(message ?? "Something went wrong.");


    container.appendChild(element);


    requestAnimationFrame(() => {

        element.classList.add("visible");

    });


    setTimeout(() => {

        element.classList.remove("visible");

        setTimeout(
            () => element.remove(),
            320
        );

    }, duration);


    /* Keep at most 4 toasts on screen. */

    while (container.children.length > 4) {

        container.firstElementChild?.remove();

    }

}


/**
 * Full-page fatal error used only when the app
 * genuinely cannot start (Supabase missing, etc.).
 */
function showFatal(message) {

    let banner = $("fatalBanner");

    if (!banner) {

        banner =
            document.createElement("div");

        banner.id = "fatalBanner";

        banner.setAttribute(
            "role",
            "alert"
        );

        document.body.appendChild(banner);

    }


    banner.textContent =
        String(message ?? "The dashboard failed to start.");

    banner.classList.add("visible");

}


/* =========================================================
   4. SHARED ACTION GUARDS
========================================================= */

/**
 * Wraps a button-driven async action.
 * - Prevents double submission (button locked until done)
 * - Restores original label even if the action throws
 * - Converts unexpected throws into a friendly toast
 *
 * `task` may return `false` to signal a handled failure
 * (the button still unlocks, no extra toast).
 */
async function withLock(
    button,
    busyText,
    task
) {

    if (!button || button.disabled) {
        return false;
    }


    const originalHTML =
        button.innerHTML;


    button.disabled = true;

    if (busyText) {

        button.textContent =
            busyText;

    }


    try {

        const result =
            await task();


        return result !== false;

    } catch (error) {

        console.error(
            "[Maison] Action failed:",
            error
        );

        toast(
            "Something went wrong. Please try again."
        );

        return false;

    } finally {

        button.disabled = false;

        button.innerHTML =
            originalHTML;

    }

}


/**
 * RPC wrapper — Supabase never rejects on HTTP errors,
 * but a dead network DOES throw. This normalizes both
 * into the familiar { data, error } shape.
 */
async function safeRpc(
    functionName,
    params
) {

    try {

        return await supabaseClient.rpc(
            functionName,
            params
        );

    } catch (networkError) {

        console.error(

            `[Maison] RPC ${functionName} threw:`,
            networkError

        );

        return {

            data: null,

            error: {

                message:
                    "Network error. Please check your connection and try again."

            }

        };

    }

}


/* =========================================================
   5. STATE
========================================================= */

let appointments = [];

let payments = [];

let currentFilter = "all";

let selectedAppointment = null;

let currentChartDays = 7;

let realtimeChannel = null;

let reloadTimer = null;

/*
 * Load pipeline guards.
 *
 * `loadSeq`           — increments on every load; a response
 *                       that arrives after a newer load started
 *                       is discarded (prevents stale UI).
 * `activeLoad`        — dedupes concurrent triggers (realtime
 *                       burst + manual refresh at once).
 * `realtimeRetryCount`— bounded reconnect attempts.
 * `lastLoadTime`      — used to resync stale tabs.
 */
let loadSeq = 0;

let activeLoad = null;

let realtimeRetryCount = 0;

let lastLoadTime = 0;


/* =========================================================
   6. HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   7. NAVIGATION
========================================================= */

navLinks.forEach(link => {

    on(link, "click", event => {

        event.preventDefault();

        navLinks.forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        const sectionName =
            link.dataset.section;

        sections.forEach(section => {
            section.classList.remove(
                "active-section"
            );
        });

        if (sectionName === "overview") {

            overviewSection?.classList.add(
                "active-section"
            );

            if (pageTitle) {
                pageTitle.textContent = "Overview";
            }

        }

        if (sectionName === "appointments") {

            appointmentsSection?.classList.add(
                "active-section"
            );

            if (pageTitle) {
                pageTitle.textContent = "Appointments";
            }

        }

        if (sectionName === "payments") {

            paymentsSection?.classList.add(
                "active-section"
            );

            if (pageTitle) {
                pageTitle.textContent = "Payments";
            }

            setTimeout(() => {
                renderRevenueChart(true);
            }, 80);

        }

    });

});


/* =========================================================
   8. VIEW ALL
========================================================= */

on(
    viewAllAppointments,
    "click",
    () => {

        const link =
            document.querySelector(
                '[data-section="appointments"]'
            );

        if (link) {
            link.click();
        }

    }
);


/* =========================================================
   9. LOAD PIPELINE (hardened)
========================================================= */

async function fetchDashboardData() {

    const appointmentsPromise =
        supabaseClient
            .from("appointments")
            .select(`
                *,
                services (
                    name,
                    price
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

    const paymentsPromise =
        supabaseClient
            .from("payments")
            .select(`
                id,
                appointment_id,
                amount,
                payment_method,
                paid_at,
                created_at
            `)
            .order(
                "paid_at",
                {
                    ascending: false
                }
            );

    return Promise.all([
        appointmentsPromise,
        paymentsPromise
    ]);
}


/**
 * Core loader.
 *
 * - Sequence number kills stale responses.
 * - Retries the whole fetch once on network failure.
 * - Never rejects — failures surface as UI + toast,
 *   and schedule one delayed automatic retry.
 */
async function loadDashboard(
    silent = false
) {

    const seq = ++loadSeq;

    if (!silent) {
        setLoadingState();
    }


    let lastError = null;


    for (
        let attempt = 0;
        attempt < 2;
        attempt++
    ) {

        try {

            const [
                appointmentsResponse,
                paymentsResponse
            ] = await fetchDashboardData();


            /*
             * A newer load started while we were in flight.
             * Discard this response entirely.
             */
            if (seq !== loadSeq) {
                return;
            }


            if (appointmentsResponse.error) {

                console.error(
                    "Appointments error:",
                    appointmentsResponse.error
                );

                showDatabaseError(
                    "Could not load appointments."
                );

                toast(
                    appointmentsResponse.error.message ||
                    "Could not load appointments."
                );

                return;
            }


            if (paymentsResponse.error) {

                console.error(
                    "Payments error:",
                    paymentsResponse.error
                );

                showDatabaseError(
                    "Could not load payments."
                );

                toast(
                    paymentsResponse.error.message ||
                    "Could not load payments."
                );

                return;
            }


            appointments =
                (appointmentsResponse.data || [])
                    .map(normalizeAppointment);


            payments =
                paymentsResponse.data || [];


            renderRecentAppointments();

            renderAppointments();

            renderPayments();

            updateStatistics();

            updatePaymentStatistics();

            renderRevenueChart();


            lastLoadTime = Date.now();

            lastError = null;

            return;


        } catch (error) {

            lastError = error;

            console.warn(

                `[Maison] Load attempt ${attempt + 1} failed:`,
                error

            );

            /*
             * Superseded while retrying — give up quietly,
             * the newer load owns the UI now.
             */
            if (seq !== loadSeq) {
                return;
            }

        }

    }


    /*
     * Both attempts failed — this is a network / outage
     * problem, not a data problem. Tell the user and queue
     * one more automatic attempt shortly.
     */
    if (lastError) {

        showDatabaseError(
            "Network error — could not load dashboard data."
        );

        toast(
            "Could not reach the database. Retrying automatically…",
            "error",
            6000
        );

        scheduleRealtimeReload();

    }

}


/**
 * Single entry point every trigger goes through.
 * Concurrent calls share the same in-flight promise
 * instead of stacking duplicate queries.
 */
function refreshDashboard(
    silent = true
) {

    if (
        activeLoad &&
        typeof activeLoad.then === "function"
    ) {

        return activeLoad;

    }


    activeLoad =
        Promise.resolve(
            loadDashboard(silent)
        ).finally(() => {

            activeLoad = null;

        });


    return activeLoad;

}


/* =========================================================
   10. LOADING / ERROR STATES
========================================================= */

function setLoadingState() {

    const loadingRow = `
        <tr>
            <td colspan="6">
                Loading appointments...
            </td>
        </tr>
    `;

    const paymentsRow = `
        <tr>
            <td colspan="6">
                Loading payments...
            </td>
        </tr>
    `;


    if (recentAppointmentsTable) {
        recentAppointmentsTable.innerHTML =
            loadingRow;
    }


    if (appointmentsTable) {
        appointmentsTable.innerHTML =
            loadingRow;
    }


    if (paymentsTable) {
        paymentsTable.innerHTML =
            paymentsRow;
    }

}


function showDatabaseError(
    message =
        "Could not load dashboard data."
) {

    const html = `
        <tr>
            <td colspan="6">
                ${escapeHTML(message)}
            </td>
        </tr>
    `;


    if (recentAppointmentsTable) {
        recentAppointmentsTable.innerHTML = html;
    }


    if (appointmentsTable) {
        appointmentsTable.innerHTML = html;
    }


    if (paymentsTable) {
        paymentsTable.innerHTML = html;
    }

}


/* =========================================================
   11. RECENT APPOINTMENTS
========================================================= */

function renderRecentAppointments() {

    if (!recentAppointmentsTable) {
        return;
    }


    if (!appointments.length) {

        recentAppointmentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No appointments yet.
                </td>
            </tr>
        `;

        return;
    }


    recentAppointmentsTable.innerHTML = "";


    appointments
        .slice(0, 3)
        .forEach(appointment => {

            recentAppointmentsTable.appendChild(
                createAppointmentRow(
                    appointment
                )
            );

        });
}


/* =========================================================
   12. FULL APPOINTMENTS TABLE
========================================================= */

function renderAppointments() {

    if (!appointmentsTable) {
        return;
    }


    const searchTerm =
        String(
            appointmentSearch?.value ||
            ""
        ).trim().toLowerCase();


    let filtered =
        [...appointments];


    if (currentFilter !== "all") {

        filtered =
            filtered.filter(
                appointment =>
                    appointment.status ===
                    currentFilter
            );

    }


    if (searchTerm) {

        filtered =
            filtered.filter(
                appointment => {

                    const name =
                        String(
                            appointment.customer_name ||
                            ""
                        ).toLowerCase();

                    const phone =
                        String(
                            appointment.phone ||
                            ""
                        ).toLowerCase();

                    const service =
                        String(
                            appointment.services?.name ||
                            ""
                        ).toLowerCase();

                    return (
                        name.includes(searchTerm) ||
                        phone.includes(searchTerm) ||
                        service.includes(searchTerm)
                    );

                }
            );

    }


    if (!filtered.length) {

        appointmentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No appointments found.
                </td>
            </tr>
        `;

        return;
    }


    appointmentsTable.innerHTML = "";


    filtered.forEach(appointment => {

        appointmentsTable.appendChild(
            createAppointmentRow(
                appointment
            )
        );

    });
}


/* =========================================================
   13. APPOINTMENT ROW
========================================================= */

function createAppointmentRow(
    appointment
) {

    if (!appointment) {

        const emptyRow =
            document.createElement("tr");

        emptyRow.innerHTML =
            `<td colspan="6">—</td>`;

        return emptyRow;

    }


    const row =
        document.createElement("tr");


    row.dataset.appointmentId =
        appointment.id ?? "";


    const status =
        String(
            appointment.status ||
            "pending"
        ).toLowerCase();


    const paymentStatus =
        String(
            appointment.payment_status ||
            "unpaid"
        ).toLowerCase();


    row.innerHTML = `

        <td>
            ${escapeHTML(
                appointment.customer_name ||
                "Unknown"
            )}

            <br>

            <small>
                ${escapeHTML(
                    appointment.phone ||
                    "No phone"
                )}
            </small>
        </td>

        <td>
            ${escapeHTML(
                appointment.services?.name ||
                "Unknown"
            )}
        </td>

        <td>
            ${escapeHTML(
                appointment.appointment_date ||
                "—"
            )}
        </td>

        <td>
            ${formatTime(
                appointment.appointment_time
            )}
        </td>

        <td>
            <span class="status ${escapeHTML(status)}">
                ${escapeHTML(status)}
            </span>
        </td>

        <td>
            <span class="payment-status ${escapeHTML(paymentStatus)}">
                ${escapeHTML(paymentStatus)}
            </span>
        </td>

    `;


    on(
        row,
        "click",
        () => {

            if (longPressTriggered) {

                longPressTriggered =
                    false;

                return;

            }

            openAppointment(
                appointment
            );

        }
    );


    attachLongPress(
        row,
        appointment
    );


    return row;
}


/* =========================================================
   14. PAYMENTS TABLE
========================================================= */

function renderPayments() {

    if (!paymentsTable) {
        return;
    }


    if (!payments.length) {

        paymentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No payment records yet.
                </td>
            </tr>
        `;

        return;
    }


    paymentsTable.innerHTML = "";


    payments.forEach(payment => {

        const appointment =
            findAppointmentForPayment(
                payment
            );


        if (!appointment) {
            return;
        }


        const service =
            appointment.services;


        const amount =
            Number(payment.amount || 0);


        const status =
            appointment.payment_status ||
            "unpaid";


        const row =
            document.createElement("tr");


        row.dataset.paymentId =
            payment.id ?? "";


        row.innerHTML = `

            <td>
                ${escapeHTML(
                    appointment.customer_name ||
                    "Unknown"
                )}
            </td>

            <td>
                ${escapeHTML(
                    service?.name ||
                    "Unknown"
                )}
            </td>

            <td>
                ${formatMoney(amount)}
            </td>

            <td>
                ${escapeHTML(
                    formatPaymentMethod(
                        payment.payment_method
                    )
                )}
            </td>

            <td>
                ${formatPaymentDate(
                    payment.paid_at
                )}
            </td>

            <td>
                <span class="payment-status ${escapeHTML(status)}">
                    ${escapeHTML(status)}
                </span>
            </td>

        `;


        on(
            row,
            "click",
            () => {

                const fresh =
                    appointments.find(
                        item =>
                            String(item.id) ===
                            String(appointment.id)
                    );


                openAppointment(
                    fresh ||
                    appointment
                );

            }
        );


        paymentsTable.appendChild(
            row
        );

    });


    if (!paymentsTable.children.length) {

        paymentsTable.innerHTML = `
            <tr>
                <td colspan="6">
                    No payment records yet.
                </td>
            </tr>
        `;

    }
}


/* =========================================================
   15. OVERVIEW STATISTICS
========================================================= */

function updateStatistics() {

    const today =
        getLocalDateString();


    const todayAppointments =
        appointments.filter(
            appointment =>
                appointment.appointment_date ===
                today &&
                appointment.status !==
                "cancelled"
        );


    const pendingAppointments =
        appointments.filter(
            appointment =>
                appointment.status ===
                "pending"
        );


    const totalRevenue =
        payments.reduce(
            (
                total,
                payment
            ) => {

                const appointment =
                    findAppointmentForPayment(
                        payment
                    );


                if (
                    appointment &&
                    appointment.status ===
                    "cancelled"
                ) {

                    return total;
                }


                const amount =
                    Number(payment.amount);


                return (
                    total +
                    (
                        Number.isFinite(amount)
                            ? amount
                            : 0
                    )
                );

            },
            0
        );


    if (todayCount) {
        todayCount.textContent =
            todayAppointments.length;
    }


    if (pendingCount) {
        pendingCount.textContent =
            pendingAppointments.length;
    }


    if (weekCount) {
        weekCount.textContent =
            getThisWeekAppointments().length;
    }


    if (revenue) {
        revenue.textContent =
            formatMoney(totalRevenue);
    }

}


/* =========================================================
   16. PAYMENT STATISTICS
========================================================= */

function updatePaymentStatistics() {

    const today =
        getLocalDateString();


    let collected = 0;

    let todayCollected = 0;

    let outstanding = 0;

    let paidCount = 0;


    payments.forEach(payment => {

        const appointment =
            findAppointmentForPayment(
                payment
            );


        if (
            appointment &&
            appointment.status ===
            "cancelled"
        ) {

            return;
        }


        const amount =
            Number(payment.amount || 0);


        collected +=
            amount;


        const paymentDate =
            payment.paid_at
                ? getDateKey(
                    new Date(
                        payment.paid_at
                    )
                )
                : null;


        if (
            paymentDate ===
            today
        ) {

            todayCollected +=
                amount;

        }

    });


    appointments.forEach(
        appointment => {

            if (
                appointment.status ===
                "cancelled"
            ) {
                return;
            }


            const price =
                Number(
                    appointment
                        .services?.price ||
                    0
                );


            const paid =
                Number(
                    appointment
                        .amount_paid ||
                    0
                );


            outstanding +=
                Math.max(
                    price -
                    paid,
                    0
                );


            if (
                appointment.payment_status ===
                "paid"
            ) {

                paidCount++;

            }

        }
    );


    if (totalCollected) {
        totalCollected.textContent =
            formatMoney(collected);
    }


    if (todayRevenue) {
        todayRevenue.textContent =
            formatMoney(todayCollected);
    }


    if (outstandingAmount) {
        outstandingAmount.textContent =
            formatMoney(outstanding);
    }


    if (paidAppointments) {
        paidAppointments.textContent =
            paidCount;
    }

}


/* =========================================================
   17. OPEN / CLOSE APPOINTMENT MODAL
========================================================= */

function openAppointment(
    appointment
) {

    if (
        !appointment ||
        !appointmentModal
    ) {
        return;
    }


    selectedAppointment =
        appointment;


    const service =
        appointment.services;


    const servicePrice =
        Number(
            service?.price || 0
        );


    const amountPaid =
        Number(
            appointment.amount_paid || 0
        );


    const amountRemaining =
        Math.max(
            servicePrice -
            amountPaid,
            0
        );


    const status =
        appointment.status ||
        "pending";


    const paymentStatus =
        appointment.payment_status ||
        getPaymentStatus(
            amountPaid,
            servicePrice
        );


    if (modalCustomerName) {
        modalCustomerName.textContent =
            appointment.customer_name ||
            "Customer";
    }


    if (modalPhone) {
        modalPhone.textContent =
            appointment.phone ||
            "—";
    }


    if (modalService) {
        modalService.textContent =
            service?.name ||
            "Unknown";
    }


    if (modalPrice) {
        modalPrice.textContent =
            formatMoney(servicePrice);
    }


    if (modalDate) {
        modalDate.textContent =
            formatDate(
                appointment.appointment_date
            );
    }


    if (modalTime) {
        modalTime.textContent =
            formatTime(
                appointment.appointment_time
            );
    }


    setStatusBadge(
        modalStatus,
        status
    );


    setPaymentBadge(
        modalPaymentStatus,
        paymentStatus
    );


    if (modalAmountPaid) {
        modalAmountPaid.textContent =
            formatMoney(amountPaid);
    }


    if (modalAmountRemaining) {
        modalAmountRemaining.textContent =
            formatMoney(amountRemaining);
    }


    if (modalCreatedAt) {
        modalCreatedAt.textContent =
            formatCreatedDate(
                appointment.created_at
            );
    }


    if (modalNotes) {
        modalNotes.textContent =
            appointment.notes ||
            "No additional details provided.";
    }


    if (paymentTotal) {
        paymentTotal.textContent =
            formatMoney(servicePrice);
    }


    if (paymentPaid) {
        paymentPaid.textContent =
            formatMoney(amountPaid);
    }


    if (paymentRemaining) {
        paymentRemaining.textContent =
            formatMoney(amountRemaining);
    }


    if (cancelAppointmentBtn) {
        cancelAppointmentBtn.disabled =
            status === "cancelled";
    }


    if (confirmAppointmentBtn) {
        confirmAppointmentBtn.disabled =
            status !== "pending";
    }


    if (recordPaymentBtn) {
        recordPaymentBtn.disabled =
            status === "cancelled" ||
            amountRemaining <= 0;
    }


    appointmentModal.classList.add(
        "active"
    );

}


function setStatusBadge(
    element,
    status
) {

    if (!element) {
        return;
    }


    const normalized =
        String(
            status ||
            "pending"
        ).toLowerCase();


    element.className =
        `status ${normalized}`;


    element.textContent =
        normalized;
}


function setPaymentBadge(
    element,
    status
) {

    if (!element) {
        return;
    }


    const normalized =
        String(
            status ||
            "unpaid"
        ).toLowerCase();


    element.className =
        `payment-status ${normalized}`;


    element.textContent =
        normalized;
}


function closeAppointmentModal() {

    appointmentModal?.classList.remove(
        "active"
    );

    selectedAppointment =
        null;
}


on(
    closeModal,
    "click",
    closeAppointmentModal
);


on(
    appointmentModal,
    "click",
    event => {

        if (
            event.target ===
            appointmentModal
        ) {

            closeAppointmentModal();

        }

    }
);


/* =========================================================
   18. CONFIRM / CANCEL APPOINTMENT
========================================================= */

on(
    confirmAppointmentBtn,
    "click",
    () => {

        if (!selectedAppointment) {
            return;
        }

        updateAppointmentStatus(
            "confirmed"
        );

    }
);


on(
    cancelAppointmentBtn,
    "click",
    () => {

        if (!selectedAppointment) {
            return;
        }


        const confirmed =
            window.confirm(

                `Cancel the appointment for ${selectedAppointment.customer_name}?`

            );


        if (!confirmed) {
            return;
        }


        updateAppointmentStatus(
            "cancelled"
        );

    }
);


/* =========================================================
   19. WHATSAPP NOTIFICATIONS
========================================================= */

function normalizeWhatsAppNumber(phone) {

    if (!phone) {
        return null;
    }

    let number = String(phone)
        .replace(/\D/g, "");

    /* Nigerian local format: 08012345678 → 2348012345678 */
    if (number.startsWith("0")) {
        number = "234" + number.slice(1);
    }

    if (number.startsWith("234")) {
        return number;
    }

    return null;
}


function createWhatsAppMessage(
    appointment,
    type
) {

    const customerName =
        appointment.customer_name ||
        "Customer";

    const serviceName =
        appointment.services?.name ||
        "your appointment";

    const date =
        formatDate(
            appointment.appointment_date
        );

    const time =
        formatTime(
            appointment.appointment_time
        );


    if (type === "confirmed") {

        return `Hi ${customerName}, your Maison Hair appointment has been confirmed. 💇🏽‍♀️

Service: ${serviceName}
Date: ${date}
Time: ${time}

We look forward to seeing you! ✨

— Maison Hair`;

    }


    if (type === "cancelled") {

        return `Hi ${customerName}, unfortunately, your Maison Hair appointment has been cancelled.

Service: ${serviceName}
Date: ${date}
Time: ${time}

Please contact us if you'd like to reschedule.

— Maison Hair`;

    }


    return "";
}


function openWhatsAppMessage(
    appointment,
    type
) {

    const phone =
        normalizeWhatsAppNumber(
            appointment.phone
        );


    if (!phone) {

        toast(
            "This customer does not have a valid Nigerian phone number.",
            "error",
            5000
        );

        return;

    }


    const message =
        createWhatsAppMessage(
            appointment,
            type
        );


    const whatsappURL =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;


    window.open(
        whatsappURL,
        "_blank"
    );
}


let pendingWhatsAppAppointment = null;

let pendingWhatsAppType = null;


function showWhatsAppPrompt(
    appointment,
    type
) {

    if (
        !whatsappModal ||
        !appointment
    ) {
        return;
    }


    const message =
        createWhatsAppMessage(
            appointment,
            type
        );


    pendingWhatsAppAppointment =
        appointment;

    pendingWhatsAppType =
        type;


    const isConfirmed =
        type === "confirmed";


    if (whatsappModalTitle) {
        whatsappModalTitle.textContent =
            isConfirmed
                ? "Appointment confirmed"
                : "Appointment cancelled";
    }


    if (whatsappModalDescription) {
        whatsappModalDescription.textContent =
            isConfirmed
                ? `Would you like to notify ${appointment.customer_name} on WhatsApp?`
                : `Would you like to notify ${appointment.customer_name} about the cancellation?`;
    }


    if (whatsappMessagePreview) {
        whatsappMessagePreview.textContent =
            message;
    }


    whatsappModal.classList.add("active");

    document.body.style.overflow = "hidden";
}


function closeWhatsAppPrompt() {

    whatsappModal?.classList.remove("active");

    document.body.style.overflow = "";

    pendingWhatsAppAppointment =
        null;

    pendingWhatsAppType =
        null;
}


on(
    whatsappModalClose,
    "click",
    closeWhatsAppPrompt
);

on(
    whatsappCancelBtn,
    "click",
    closeWhatsAppPrompt
);

on(
    whatsappModal,
    "click",
    event => {

        if (
            event.target ===
            whatsappModal
        ) {
            closeWhatsAppPrompt();
        }

    }
);


on(
    whatsappSendBtn,
    "click",
    () => {

        if (
            !pendingWhatsAppAppointment ||
            !pendingWhatsAppType
        ) {
            return;
        }

        const appointment =
            pendingWhatsAppAppointment;

        const type =
            pendingWhatsAppType;


        closeWhatsAppPrompt();

        openWhatsAppMessage(
            appointment,
            type
        );
    }
);


/* =========================================================
   20. UPDATE APPOINTMENT STATUS
   (rewritten: no duplicated block, button lock, throws safe)
========================================================= */

async function updateAppointmentStatus(
    newStatus
) {

    if (!selectedAppointment) {
        return;
    }


    const appointmentId =
        selectedAppointment.id;


    const button =
        newStatus === "cancelled"
            ? cancelAppointmentBtn
            : confirmAppointmentBtn;


    const functionName =
        newStatus === "cancelled"
            ? "cancel_appointment"
            : "confirm_appointment";


    await withLock(
        button,
        "Updating...",
        async () => {


            const {
                error
            } =
                await safeRpc(
                    functionName,
                    {
                        p_appointment_id:
                            appointmentId
                    }
                );


            if (error) {

                toast(
                    error.message ||
                    "Could not update the appointment.",
                    "error",
                    6000
                );

                return false;
            }


            /*
             * Get fresh data from Supabase.
             * (Uses refreshDashboard so this never stacks
             *  with an in-flight realtime reload.)
             */

            await refreshDashboard(true);


            const updated =
                appointments.find(
                    appointment =>
                        String(appointment.id) ===
                        String(appointmentId)
                );


            if (updated) {

                selectedAppointment =
                    updated;

                openAppointment(
                    updated
                );

                showWhatsAppPrompt(
                    updated,
                    newStatus
                );

            } else {

                /*
                 * The row disappeared (deleted elsewhere).
                 * Close the modal instead of showing ghosts.
                 */

                closeAppointmentModal();

            }


            return true;

        }
    );

}


/* =========================================================
   21. RECORD PAYMENT MODAL
========================================================= */

on(
    recordPaymentBtn,
    "click",
    () => {

        if (
            !selectedAppointment ||
            !paymentModal
        ) {
            return;
        }


        const currentPaid =
            Number(
                selectedAppointment.amount_paid ||
                0
            );


        const servicePrice =
            Number(
                selectedAppointment
                    .services?.price ||
                0
            );


        const remaining =
            Math.max(
                servicePrice -
                currentPaid,
                0
            );


        if (remaining <= 0) {
            return;
        }


        if (paymentCustomerName) {
            paymentCustomerName.textContent =
                selectedAppointment.customer_name ||
                "Customer";
        }


        if (paymentAmount) {

            paymentAmount.value = "";

            paymentAmount.max =
                String(remaining);

        }


        if (currentPaidPreview) {
            currentPaidPreview.textContent =
                formatMoney(currentPaid);
        }


        if (afterPaymentPreview) {
            afterPaymentPreview.textContent =
                formatMoney(currentPaid);
        }


        if (afterPaymentRemaining) {
            afterPaymentRemaining.textContent =
                formatMoney(remaining);
        }


        paymentModal.classList.add(
            "active"
        );


        setTimeout(
            () => paymentAmount?.focus(),
            100
        );

    }
);


/* =========================================================
   22. PAYMENT PREVIEW
========================================================= */

function updatePaymentPreview() {

    if (
        !selectedAppointment ||
        !paymentAmount
    ) {
        return;
    }


    const currentPaid =
        Number(
            selectedAppointment.amount_paid ||
            0
        );


    const servicePrice =
        Number(
            selectedAppointment
                .services?.price ||
            0
        );


    let enteredAmount =
        Number(
            paymentAmount.value ||
            0
        );


    if (!Number.isFinite(enteredAmount)) {
        enteredAmount = 0;
    }


    if (enteredAmount < 0) {
        enteredAmount = 0;
    }


    const newPaid =
        currentPaid +
        enteredAmount;


    const newRemaining =
        Math.max(
            servicePrice -
            newPaid,
            0
        );


    if (currentPaidPreview) {
        currentPaidPreview.textContent =
            formatMoney(currentPaid);
    }


    if (afterPaymentPreview) {
        afterPaymentPreview.textContent =
            formatMoney(newPaid);
    }


    if (afterPaymentRemaining) {
        afterPaymentRemaining.textContent =
            formatMoney(newRemaining);
    }

}


on(
    paymentAmount,
    "input",
    () => {

        /*
         * Reject junk typed into the amount field
         * (negatives, decimals with a leading dot, …)
         */
        if (paymentAmount.value) {

            const numeric =
                Number(paymentAmount.value);


            if (
                !Number.isFinite(numeric) ||
                numeric < 0
            ) {

                paymentAmount.value =
                    "";

            }

        }


        updatePaymentPreview();

    }
);


/* =========================================================
   23. SAVE PAYMENT
========================================================= */

on(
    savePaymentBtn,
    "click",
    () => {

        if (!selectedAppointment) {
            return;
        }


        const enteredAmount =
            Number(
                paymentAmount?.value
            );


        if (
            !Number.isFinite(
                enteredAmount
            ) ||
            enteredAmount <= 0
        ) {

            toast(
                "Please enter a valid payment amount.",
                "error",
                5000
            );

            return;
        }


        const servicePrice =
            Number(
                selectedAppointment
                    .services?.price ||
                0
            );


        const currentPaid =
            Number(
                selectedAppointment
                    .amount_paid ||
                0
            );


        const remaining =
            Math.max(
                servicePrice -
                currentPaid,
                0
            );


        if (
            enteredAmount >
            remaining
        ) {

            toast(

                `Payment cannot exceed the remaining balance of ${formatMoney(remaining)}.`,

                "error",
                6000
            );

            return;
        }


        const method =
            paymentMethod?.value;


        if (
            ![
                "transfer",
                "cash",
                "card"
            ].includes(method)
        ) {

            toast(
                "Please select a valid payment method.",
                "error",
                5000
            );

            return;
        }


        /*
         * NOTE: record_payment is NOT idempotent, so we
         * deliberately do NOT auto-retry it. The button
         * lock already prevents double submission.
         */
        withLock(
            savePaymentBtn,
            "Saving...",
            async () => {


                const {
                    error
                } =
                    await safeRpc(
                        "record_payment",
                        {
                            p_appointment_id:
                                selectedAppointment.id,

                            p_amount:
                                enteredAmount,

                            p_payment_method:
                                method
                        }
                    );


                if (error) {

                    toast(
                        error.message ||
                        "Could not save payment.",
                        "error",
                        6000
                    );

                    return false;
                }


                /*
                 * The RPC inserted into payments.
                 *
                 * The database trigger then updates:
                 * amount_paid
                 * payment_status
                 *
                 * Now reload everything from the DB.
                 */

                paymentModal?.classList.remove(
                    "active"
                );


                await refreshDashboard(true);


                const updated =
                    appointments.find(
                        appointment =>
                            String(appointment.id) ===
                            String(
                                selectedAppointment.id
                            )
                    );


                if (updated) {

                    selectedAppointment =
                        updated;

                    openAppointment(
                        updated
                    );

                }


                toast(
                    "Payment recorded successfully.",
                    "success"
                );


                return true;

            }
        );

    }
);


on(
    closePaymentModal,
    "click",
    () => {

        paymentModal?.classList.remove(
            "active"
        );

    }
);


on(
    paymentModal,
    "click",
    event => {

        if (
            event.target ===
            paymentModal
        ) {

            paymentModal.classList.remove(
                "active"
            );

        }

    }
);


/* =========================================================
   24. SEARCH (debounced) + FILTERS
========================================================= */

const debouncedRenderAppointments =
    debounce(renderAppointments, 200);


on(
    appointmentSearch,
    "input",
    debouncedRenderAppointments
);


filterButtons.forEach(button => {

    on(
        button,
        "click",
        () => {

            filterButtons.forEach(
                item =>
                    item.classList.remove(
                        "active"
                    )
            );


            button.classList.add(
                "active"
            );


            currentFilter =
                button.dataset.filter ||
                "all";


            renderAppointments();

        }
    );

});


/* =========================================================
   25. CHART RANGE
========================================================= */

chartRangeButtons.forEach(button => {

    on(
        button,
        "click",
        () => {

            chartRangeButtons.forEach(
                item =>
                    item.classList.remove(
                        "active"
                    )
            );


            button.classList.add(
                "active"
            );


            currentChartDays =
                Number(
                    button.dataset.range
                ) || 7;


            renderRevenueChart(true);

        }
    );

});


/* =========================================================
   26. REVENUE CHART
========================================================= */

function renderRevenueChart(
    animate = false
) {

    if (
        !revenueChart ||
        !chartCard
    ) {
        return;
    }


    if (!payments.length) {

        showEmptyChart();

        return;
    }


    const dates =
        getLastNDates(
            currentChartDays
        );


    const grouped =
        {};


    dates.forEach(
        date => {

            grouped[date] = 0;

        }
    );


    payments.forEach(payment => {

        const appointment =
            findAppointmentForPayment(
                payment
            );


        if (
            appointment &&
            appointment.status ===
            "cancelled"
        ) {

            return;
        }


        if (!payment.paid_at) {
            return;
        }


        const paidDate =
            new Date(
                payment.paid_at
            );


        if (isNaN(paidDate.getTime())) {
            return;
        }


        const paymentDate =
            getDateKey(paidDate);


        if (
            Object.prototype.hasOwnProperty.call(
                grouped,
                paymentDate
            )
        ) {

            grouped[paymentDate] +=
                Number(
                    payment.amount ||
                    0
                );

        }

    });


    /*
     * Sanitize every value — a single NaN would
     * silently kill the whole SVG path.
     */
    const values =
        dates.map(date => {

            const value =
                Number(
                    grouped[date]
                );

            return Number.isFinite(value)
                ? value
                : 0;

        });


    const total =
        values.reduce(
            (
                sum,
                value
            ) =>
                sum + value,
            0
        );


    chartCard.classList.remove(
        "empty"
    );


    if (chartEmpty) {
        chartEmpty.style.display =
            "none";
    }


    if (chartRange) {
        chartRange.textContent =
            `${currentChartDays} days · ${formatMoney(total)}`;
    }


    drawChart(
        dates,
        values,
        animate
    );
}


function showEmptyChart() {

    if (!chartCard) {
        return;
    }


    chartCard.classList.add(
        "empty"
    );


    if (chartRange) {
        chartRange.textContent =
            "No payments yet";
    }


    chartLine?.setAttribute("d", "");

    chartArea?.setAttribute("d", "");


    if (chartGrid) {
        chartGrid.innerHTML = "";
    }


    if (chartDots) {
        chartDots.innerHTML = "";
    }


    if (chartLabels) {
        chartLabels.innerHTML = "";
    }


    if (chartEmpty) {
        chartEmpty.style.display =
            "flex";
    }

}


function drawChart(
    dates,
    values,
    animate = true
) {

    if (
        !dates?.length ||
        !values?.length ||
        dates.length !== values.length
    ) {
        return;
    }


    const width = 1000;

    const height = 360;

    const paddingLeft = 35;

    const paddingRight = 25;

    const paddingTop = 30;

    const paddingBottom = 35;


    const graphWidth =
        width -
        paddingLeft -
        paddingRight;


    const graphHeight =
        height -
        paddingTop -
        paddingBottom;


    const maxValue =
        Math.max(
            ...values,
            1
        );


    const points =
        values.map(
            (value, index) => {

                const x =
                    dates.length === 1
                        ? width / 2
                        : paddingLeft +
                          (
                              index /
                              (
                                  dates.length -
                                  1
                              )
                          ) *
                          graphWidth;


                const y =
                    paddingTop +
                    graphHeight -
                    (
                        value /
                        maxValue
                    ) *
                    graphHeight;


                return {
                    x,
                    y,
                    value,
                    date:
                        dates[index]
                };

            }
        );


    /* ---------- Grid ---------- */

    if (chartGrid) {

        chartGrid.innerHTML = "";


        for (
            let i = 0;
            i <= 4;
            i++
        ) {

            const y =
                paddingTop +
                (
                    graphHeight *
                    i /
                    4
                );


            chartGrid.insertAdjacentHTML(
                "beforeend",
                `
                    <line
                        class="chart-grid-line"
                        x1="${paddingLeft}"
                        y1="${y}"
                        x2="${width - paddingRight}"
                        y2="${y}"
                    />
                `
            );

        }

    }


    /* ---------- Smooth line path ---------- */

    let linePath = "";


    points.forEach(
        (point, index) => {

            if (index === 0) {

                linePath =
                    `M ${point.x} ${point.y}`;

                return;
            }


            const previous =
                points[index - 1];


            const controlX =
                (
                    previous.x +
                    point.x
                ) / 2;


            linePath +=
                ` C ${controlX} ${previous.y},
                  ${controlX} ${point.y},
                  ${point.x} ${point.y}`;

        }
    );


    const lastPoint =
        points[points.length - 1];


    const firstPoint =
        points[0];


    const areaPath =
        `${linePath}
         L ${lastPoint.x} ${height - paddingBottom}
         L ${firstPoint.x} ${height - paddingBottom}
         Z`;


    chartLine?.setAttribute(
        "d",
        linePath
    );


    chartArea?.setAttribute(
        "d",
        areaPath
    );


    /* ---------- Animate line ---------- */

    if (chartLine) {

        try {

            const lineLength =
                chartLine.getTotalLength();


            chartLine.style.strokeDasharray =
                lineLength;


            if (animate) {

                chartLine.style.strokeDashoffset =
                    lineLength;

                void chartLine.getBoundingClientRect();

                chartLine.style.transition =
                    "stroke-dashoffset 1.25s cubic-bezier(.65,0,.35,1)";

                chartLine.style.strokeDashoffset =
                    "0";

            } else {

                chartLine.style.transition =
                    "none";

                chartLine.style.strokeDashoffset =
                    "0";

            }

        } catch (chartError) {

            /*
             * getTotalLength can throw if the path is
             * momentarily detached — degrade gracefully.
             */
            console.warn(
                "[Maison] Chart animation skipped:",
                chartError
            );

        }

    }


    /* ---------- Dots ---------- */

    if (chartDots) {

        chartDots.innerHTML = "";


        points.forEach(
            (point, index) => {

                const circle =
                    document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "circle"
                    );


                circle.setAttribute(
                    "cx",
                    point.x
                );


                circle.setAttribute(
                    "cy",
                    point.y
                );


                circle.setAttribute(
                    "r",
                    "5"
                );


                circle.classList.add(
                    "chart-dot"
                );


                circle.style.transitionDelay =
                    animate
                        ? `${850 + index * 45}ms`
                        : "0ms";


                on(
                    circle,
                    "mouseenter",
                    event => {

                        showChartTooltip(
                            event,
                            point
                        );

                    }
                );


                on(
                    circle,
                    "mouseleave",
                    hideChartTooltip
                );


                chartDots.appendChild(
                    circle
                );


                requestAnimationFrame(
                    () => {

                        circle.classList.add(
                            "visible"
                        );

                    }
                );

            }
        );

    }


    /* ---------- Date labels ---------- */

    if (chartLabels) {

        chartLabels.innerHTML = "";


        const labelIndexes =
            getLabelIndexes(
                dates.length
            );


        dates.forEach(
            (date, index) => {

                const label =
                    document.createElement(
                        "span"
                    );


                label.textContent =
                    formatShortDate(
                        date
                    );


                if (
                    !labelIndexes.includes(
                        index
                    )
                ) {

                    label.style.visibility =
                        "hidden";

                }


                chartLabels.appendChild(
                    label
                );

            }
        );

    }

}


function getLabelIndexes(
    count
) {

    if (count <= 7) {

        return Array.from(
            {
                length: count
            },
            (_, index) =>
                index
        );

    }


    const indexes = [
        0
    ];


    const step =
        (count - 1) / 5;


    for (
        let i = 1;
        i < 5;
        i++
    ) {

        indexes.push(
            Math.round(
                step * i
            )
        );

    }


    indexes.push(
        count - 1
    );


    return [
        ...new Set(indexes)
    ];
}


function showChartTooltip(
    event,
    point
) {

    if (
        !chartTooltip ||
        !revenueChart
    ) {
        return;
    }


    const rect =
        revenueChart.getBoundingClientRect();


    if (
        !rect.width ||
        !rect.height
    ) {
        return;
    }


    const scaleX =
        rect.width / 1000;


    const scaleY =
        rect.height / 360;


    chartTooltip.style.display =
        "block";


    chartTooltip.textContent =
        `${formatShortDate(
            point.date
        )} · ${formatMoney(
            point.value
        )}`;


    chartTooltip.style.left =
        `${point.x * scaleX}px`;


    chartTooltip.style.top =
        `${Math.max(
            point.y * scaleY - 45,
            5
        )}px`;

}


function hideChartTooltip() {

    if (chartTooltip) {

        chartTooltip.style.display =
            "none";

    }

}


/* =========================================================
   27. THIS WEEK
========================================================= */

function getThisWeekAppointments() {

    const now =
        new Date();


    const day =
        now.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    const start =
        new Date(now);


    start.setDate(
        now.getDate() +
        difference
    );


    start.setHours(
        0,
        0,
        0,
        0
    );


    const end =
        new Date(start);


    end.setDate(
        start.getDate() +
        7
    );


    return appointments.filter(
        appointment => {

            if (
                appointment.status ===
                "cancelled"
            ) {
                return false;
            }


            const date =
                parseLocalDate(
                    appointment.appointment_date
                );


            if (isNaN(date.getTime())) {
                return false;
            }


            return (
                date >= start &&
                date < end
            );

        }
    );
}


/* =========================================================
   28. LOOKUPS + DATE HELPERS (hardened)
========================================================= */

function findAppointmentForPayment(
    payment
) {

    if (!payment) {
        return null;
    }


    return appointments.find(
        appointment =>
            String(
                appointment.id
            ) ===
            String(
                payment.appointment_id
            )
    );
}


function getLastNDates(
    numberOfDays
) {

    const dates = [];

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    for (
        let i = numberOfDays - 1;
        i >= 0;
        i--
    ) {

        const date =
            new Date(today);


        date.setDate(
            today.getDate() - i
        );


        dates.push(
            getDateKey(date)
        );

    }


    return dates;
}


function getLocalDateString() {

    return getDateKey(
        new Date()
    );
}


function getDateKey(
    date
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;
}


function parseLocalDate(
    dateString
) {

    if (
        !dateString ||
        typeof dateString !== "string"
    ) {
        return new Date(NaN);
    }


    const parts =
        dateString
            .split("-")
            .map(Number);


    if (
        parts.length !== 3 ||
        parts.some(
            part => !Number.isFinite(part)
        )
    ) {
        return new Date(NaN);
    }


    const [
        year,
        month,
        day
    ] =
        parts;


    return new Date(
        year,
        month - 1,
        day
    );
}


function formatDate(
    date
) {

    const parsed =
        parseLocalDate(date);


    if (isNaN(parsed.getTime())) {
        return "—";
    }


    return parsed.toLocaleDateString(
        "en-NG",
        {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );
}


function formatShortDate(
    date
) {

    const parsed =
        parseLocalDate(date);


    if (isNaN(parsed.getTime())) {
        return "—";
    }


    return parsed.toLocaleDateString(
        "en-NG",
        {
            day: "numeric",
            month: "short"
        }
    );
}


function formatTime(
    time
) {

    if (
        !time ||
        typeof time !== "string" ||
        !time.includes(":")
    ) {
        return "—";
    }


    const [
        hours,
        minutes
    ] =
        time.split(":");


    const numericHours =
        Number(hours);

    const numericMinutes =
        Number(minutes);


    if (
        !Number.isFinite(numericHours) ||
        !Number.isFinite(numericMinutes)
    ) {
        return "—";
    }


    const date =
        new Date();


    date.setHours(
        numericHours,
        numericMinutes,
        0,
        0
    );


    if (isNaN(date.getTime())) {
        return "—";
    }


    return date.toLocaleTimeString(
        "en-NG",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function formatCreatedDate(
    date
) {

    const parsed =
        new Date(date);


    if (isNaN(parsed.getTime())) {
        return "—";
    }


    return parsed.toLocaleString(
        "en-NG",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function formatPaymentDate(
    date
) {

    const parsed =
        new Date(date);


    if (isNaN(parsed.getTime())) {
        return "—";
    }


    return parsed.toLocaleString(
        "en-NG",
        {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


function formatPaymentMethod(
    method
) {

    const labels = {
        transfer: "Transfer",
        cash: "Cash",
        card: "Card"
    };


    return (
        labels[method] ||
        method ||
        "Unknown"
    );
}


/**
 * NaN / Infinity / negative-safe money formatter.
 */
function formatMoney(
    amount
) {

    const value =
        Number(amount || 0);


    if (
        !Number.isFinite(value) ||
        value < 0
    ) {
        return "₦0";
    }


    return `₦${Math.round(value).toLocaleString(
        "en-NG",
        {
            maximumFractionDigits: 0
        }
    )}`;
}


/* =========================================================
   29. PAYMENT STATUS + NORMALIZATION
========================================================= */

function getPaymentStatus(
    amountPaid,
    servicePrice
) {

    const paid =
        Number(amountPaid) || 0;

    const price =
        Number(servicePrice) || 0;


    if (paid <= 0) {
        return "unpaid";
    }


    if (paid < price) {
        return "partial";
    }


    return "paid";
}


function normalizeAppointment(
    appointment
) {

    /*
     * The database trigger is the source
     * of truth for payment_status.
     *
     * We only calculate a fallback if the
     * returned value is missing.
     */

    const price =
        Number(
            appointment?.services?.price ||
            0
        );


    const paid =
        Number(
            appointment?.amount_paid ||
            0
        );


    return {
        ...appointment,

        payment_status:
            appointment?.payment_status ||
            getPaymentStatus(
                paid,
                price
            )
    };
}


/* =========================================================
   30. REFRESH
========================================================= */

on(
    refreshBtn,
    "click",
    () => {

        withLock(
            refreshBtn,
            "Refreshing...",
            () => refreshDashboard(false)
        );

    }
);


/* =========================================================
   31. REALTIME (with bounded auto-reconnect)
========================================================= */

function scheduleRealtimeReload() {

    clearTimeout(
        reloadTimer
    );


    reloadTimer =
        setTimeout(
            () => {

                refreshDashboard(true);

            },
            350
        );

}


function subscribeToRealtime() {

    if (realtimeChannel) {

        try {

            supabaseClient.removeChannel(
                realtimeChannel
            );

        } catch (removeError) {

            console.warn(
                "[Maison] Could not remove old channel:",
                removeError
            );

        }

    }


    realtimeChannel =
        supabaseClient

            .channel(
                "maison-hair-admin"
            )

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "appointments"
                },
                scheduleRealtimeReload
            )

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "payments"
                },
                scheduleRealtimeReload
            )

            .subscribe(
                status => {

                    console.log(
                        "[Maison] Realtime:",
                        status
                    );


                    if (
                        status === "CHANNEL_ERROR" ||
                        status === "TIMED_OUT"
                    ) {

                        /*
                         * Exponential-ish backoff, capped at
                         * 5 attempts so we never spin forever.
                         */
                        if (realtimeRetryCount < 5) {

                            realtimeRetryCount++;

                            setTimeout(
                                subscribeToRealtime,
                                3000 * realtimeRetryCount
                            );

                        } else {

                            console.warn(

                                "[Maison] Realtime gave up after 5 retries. " +
                                "Falling back to resync-on-visible."

                            );

                        }

                    }


                    if (status === "SUBSCRIBED") {
                        realtimeRetryCount = 0;
                    }

                }
            );

}


/* =========================================================
   32. KEYBOARD (Escape now closes EVERYTHING)
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        closeAppointmentModal();

        paymentModal?.classList.remove(
            "active"
        );

        closeWhatsAppPrompt();

        profileCard?.classList.remove(
            "active"
        );

        adminProfile?.classList.remove(
            "open"
        );

        hideAppointmentActionMenu();

        hideChartTooltip();

    }
);


/* =========================================================
   33. LIFECYCLE — VISIBILITY, ONLINE/OFFLINE, CLEANUP
========================================================= */

/*
 * Browsers freeze/drop websocket connections in background
 * tabs. When the admin comes back, resync if the data is
 * more than a minute old.
 */
document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState !==
            "visible"
        ) {
            return;
        }


        const staleFor =
            Date.now() -
            lastLoadTime;


        if (
            lastLoadTime === 0 ||
            staleFor > 60000
        ) {

            refreshDashboard(true);

        }

    }
);


function updateOnlineStatus() {

    const banner =
        $("offlineBanner");


    if (!banner) {
        return;
    }


    banner.classList.toggle(
        "visible",
        !navigator.onLine
    );

}


window.addEventListener(
    "online",
    () => {

        updateOnlineStatus();

        toast(
            "Back online. Refreshing…",
            "success"
        );

        refreshDashboard(true);

    }
);


window.addEventListener(
    "offline",
    () => {

        updateOnlineStatus();

        toast(
            "You are offline. The dashboard will resync when you reconnect.",
            "error",
            6000
        );

    }
);


window.addEventListener(
    "beforeunload",
    () => {

        clearTimeout(
            reloadTimer
        );


        if (realtimeChannel) {

            try {

                supabaseClient.removeChannel(
                    realtimeChannel
                );

            } catch (_) {

                /* Page is unloading anyway. */

            }

        }

    }
);


/* =========================================================
   34. ADMIN PROFILE CARD
========================================================= */

on(
    adminProfile,
    "click",
    event => {

        event.stopPropagation();

        profileCard?.classList.toggle(
            "active"
        );

        adminProfile?.classList.toggle(
            "open"
        );

        hideAppointmentActionMenu();

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !profileCard ||
            !adminProfile
        ) {
            return;
        }


        if (
            !profileCard.contains(event.target) &&
            !adminProfile.contains(event.target)
        ) {

            profileCard.classList.remove(
                "active"
            );

            adminProfile.classList.remove(
                "open"
            );

        }

    }
);


/* =========================================================
   35. CLEAR ALL DASHBOARD DATA
========================================================= */

on(
    clearDataBtn,
    "click",
    () => {

        const confirmed =
            window.confirm(

                "This will permanently delete ALL appointments and their payment records. Your services will not be deleted.\n\nContinue?"

            );


        if (!confirmed) {
            return;
        }


        withLock(
            clearDataBtn,
            null,
            async () => {


                const {
                    error
                } =
                    await safeRpc(
                        "clear_dashboard_data"
                    );


                if (error) {

                    toast(
                        error.message ||
                        "Could not clear dashboard data.",
                        "error",
                        6000
                    );

                    return false;
                }


                appointments = [];

                payments = [];

                selectedAppointment =
                    null;


                appointmentModal?.classList.remove(
                    "active"
                );

                paymentModal?.classList.remove(
                    "active"
                );


                await refreshDashboard(true);


                profileCard?.classList.remove(
                    "active"
                );

                adminProfile?.classList.remove(
                    "open"
                );


                toast(
                    "All dashboard data has been cleared.",
                    "success"
                );


                return true;

            }
        ).then(() => {

            /*
             * withLock restores innerHTML in `finally`,
             * so the spinner is cleaned up automatically.
             */

        });

    }
);

/* =========================================================
   35B. LOGOUT
========================================================= */

on(
    logoutBtn,
    "click",
    () => {

        withLock(
            logoutBtn,
            "Logging out...",
            async () => {

                const {
                    error
                } = await supabaseClient.auth.signOut();


                if (error) {

                    console.error(
                        "[Maison] Logout failed:",
                        error
                    );

                    toast(
                        error.message ||
                        "Could not log out. Please try again.",
                        "error",
                        6000
                    );

                    return false;
                }


                window.location.replace(
                    "login.html"
                );


                return true;

            }
        );

    }
);

/* =========================================================
   36. LONG-PRESS DELETE
========================================================= */

let longPressTimer = null;

let longPressTriggered = false;

let longPressAppointment = null;


function attachLongPress(
    row,
    appointment
) {

    if (!row) {
        return;
    }


    let startX = 0;

    let startY = 0;


    const startPress = event => {

        longPressTriggered =
            false;


        if (
            event.touches &&
            event.touches.length
        ) {

            startX =
                event.touches[0].clientX;

            startY =
                event.touches[0].clientY;

        } else {

            startX =
                event.clientX;

            startY =
                event.clientY;

        }


        clearTimeout(
            longPressTimer
        );


        longPressTimer =
            setTimeout(
                () => {

                    longPressTriggered =
                        true;

                    longPressAppointment =
                        appointment;


                    showAppointmentActionMenu(
                        event,
                        startX,
                        startY
                    );

                },
                700
            );

    };


    const cancelPress = event => {

        clearTimeout(
            longPressTimer
        );


        if (
            event.touches &&
            event.touches.length
        ) {

            const x =
                event.touches[0].clientX;

            const y =
                event.touches[0].clientY;


            if (
                Math.abs(x - startX) > 12 ||
                Math.abs(y - startY) > 12
            ) {

                longPressTriggered =
                    false;

            }

        }

    };


    on(
        row,
        "touchstart",
        startPress,
        {
            passive: true
        }
    );


    on(
        row,
        "touchend",
        cancelPress
    );


    on(
        row,
        "touchmove",
        cancelPress,
        {
            passive: true
        }
    );


    on(
        row,
        "mousedown",
        startPress
    );


    on(
        row,
        "mouseup",
        cancelPress
    );


    on(
        row,
        "mouseleave",
        cancelPress
    );


    on(
        row,
        "contextmenu",
        event => {

            event.preventDefault();

        }
    );

}


/* =========================================================
   37. ACTION MENU
========================================================= */

function showAppointmentActionMenu(
    event,
    x,
    y
) {

    if (!appointmentActionMenu) {
        return;
    }


    appointmentActionMenu.classList.add(
        "active"
    );


    const menuWidth =
        appointmentActionMenu.offsetWidth;


    const menuHeight =
        appointmentActionMenu.offsetHeight;


    let left =
        x;

    let top =
        y;


    if (
        left + menuWidth >
        window.innerWidth - 10
    ) {

        left =
            window.innerWidth -
            menuWidth -
            10;

    }


    if (
        top + menuHeight >
        window.innerHeight - 10
    ) {

        top =
            window.innerHeight -
            menuHeight -
            10;

    }


    appointmentActionMenu.style.left =
        `${Math.max(left, 10)}px`;


    appointmentActionMenu.style.top =
        `${Math.max(top, 10)}px`;

}


function hideAppointmentActionMenu() {

    appointmentActionMenu?.classList.remove(
        "active"
    );

    longPressAppointment =
        null;

}


/* =========================================================
   38. DELETE APPOINTMENT
========================================================= */

on(
    deleteAppointmentBtn,
    "click",
    () => {

        if (!longPressAppointment) {
            return;
        }


        const appointment =
            longPressAppointment;


        hideAppointmentActionMenu();


        const confirmed =
            window.confirm(

                `Permanently delete ${appointment.customer_name}'s appointment?\n\nThis will also remove any payment records belonging to this appointment.`

            );


        if (!confirmed) {
            return;
        }


        withLock(
            deleteAppointmentBtn,
            null,
            async () => {


                const {
                    error
                } =
                    await safeRpc(
                        "delete_appointment",
                        {
                            p_appointment_id:
                                appointment.id
                        }
                    );


                if (error) {

                    toast(
                        error.message ||
                        "Could not delete appointment.",
                        "error",
                        6000
                    );

                    return false;
                }


                /*
                 * Reload everything directly from
                 * Supabase so every number/table/chart
                 * is updated.
                 */

                await refreshDashboard(true);


                if (
                    selectedAppointment &&
                    String(
                        selectedAppointment.id
                    ) ===
                    String(
                        appointment.id
                    )
                ) {

                    closeAppointmentModal();

                }


                toast(
                    "Appointment deleted.",
                    "success"
                );


                return true;

            }
        );

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !appointmentActionMenu ||
            appointmentActionMenu.contains(
                event.target
            )
        ) {
            return;
        }


        hideAppointmentActionMenu();

    }
);

/* =========================================================
   38B. AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        if (
            event === "SIGNED_OUT" ||
            !session
        ) {

            window.location.replace(
                "login.html"
            );

        }

    }
);

/* =========================================================
   39. INITIAL LOAD — AUTHENTICATED
========================================================= */

async function initAdminDashboard() {

    const authorized =
        await requireAdminSession();


    if (!authorized) {
        return;
    }


    try {

        await refreshDashboard(false);

        subscribeToRealtime();

        updateOnlineStatus();


        console.log(
            "[Maison] Authenticated admin dashboard initialized."
        );

    } catch (fatalError) {

        console.error(
            "[Maison] Fatal init error:",
            fatalError
        );

        showFatal(
            "The dashboard could not start. Please refresh the page."
        );

    }

}


initAdminDashboard();