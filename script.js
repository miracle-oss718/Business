const SUPABASE_URL = "https://upvbaagmusbrqbbcdudv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwdmJhYWdtdXNicnFiYmNkdWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MDg0ODAsImV4cCI6MjEwNjE4NDQ4MH0.2H4c-v3CCT7bj5AaNRs366_cmZAb1RGg1X78WFkTndg";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const bookingForm = document.getElementById("bookingForm");
const serviceSelect = document.getElementById("service");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");


// LOAD SERVICES
async function loadServices() {

    const { data, error } = await supabaseClient
        .from("services")
        .select("*")
        .order("name");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(service => {

        const option = document.createElement("option");

        option.value = service.id;

        option.textContent =
            `${service.name} — ₦${Number(service.price).toLocaleString()}`;

        serviceSelect.appendChild(option);
    });
}


// SUBMIT BOOKING
bookingForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = "Booking...";

    const booking = {

        customer_name:
            document.getElementById("name").value.trim(),

        phone:
            document.getElementById("phone").value.trim(),

        service_id:
            Number(serviceSelect.value),

        appointment_date:
            document.getElementById("date").value,

        appointment_time:
            document.getElementById("time").value,

        notes:
            document.getElementById("notes").value.trim()
    };


    const { error } = await supabaseClient
        .from("appointments")
        .insert([booking]);


    if (error) {

        console.error(error);

        message.textContent =
            "Something went wrong. Please try again.";

        submitBtn.disabled = false;
        submitBtn.textContent = "Book Appointment";

        return;
    }


    message.textContent =
        "Appointment request received! We'll contact you shortly.";

    bookingForm.reset();

    submitBtn.disabled = false;
    submitBtn.textContent = "Book Appointment";

});


// START
loadServices();