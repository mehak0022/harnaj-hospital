const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = 3000;

// Read website files
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MySQL database
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "007800",
    database: "hospital"
});

// Test route
app.get("/api/test", (req, res) => {
    res.send("Hospital server is working!");
});

// Book appointment
app.post("/api/appointments", (req, res) => {
    const {
        patientName,
        phone,
        email,
        department,
        appointmentDate
    } = req.body;

    if (!patientName || !phone || !department || !appointmentDate) {
        return res.status(400).json({
            success: false,
            message: "Please fill all required fields."
        });
    }

    const findPatient =
        "SELECT patient_id FROM patients WHERE phone = ? LIMIT 1";

    db.query(findPatient, [phone], (err, results) => {
        if (err) {
            console.log(err.message);
            return res.status(500).json({
                success: false,
                message: "Patient search failed."
            });
        }

        function saveAppointment(patientId) {
            const sql = `
                INSERT INTO appointments
                (patient_id, doctor_id, appointment_date,
                 appointment_time, reason)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [patientId, 1, appointmentDate, "10:00:00", department],
                (err, result) => {
                    if (err) {
                        console.log(err.message);
                        return res.status(500).json({
                            success: false,
                            message: "Appointment could not be saved."
                        });
                    }

                    res.json({
                        success: true,
                        message: "Appointment booked successfully!",
                        appointmentId: result.insertId
                    });
                }
            );
        }

        if (results.length > 0) {
            saveAppointment(results[0].patient_id);
        } else {
            const insertPatient = `
                INSERT INTO patients
                (name, age, gender, phone, address)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.query(
                insertPatient,
                [patientName, 0, "Not Specified", phone, "Online Booking"],
                (err, result) => {
                    if (err) {
                        console.log(err.message);
                        return res.status(500).json({
                            success: false,
                            message: "Patient could not be saved."
                        });
                    }

                    saveAppointment(result.insertId);
                }
            );
        }
    });
});

// Connect and start server
db.connect((err) => {
    if (err) {
        console.log("MySQL connection error:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");

    app.listen(PORT, () => {
        console.log(`Website running at http://localhost:${PORT}`);
    });
});