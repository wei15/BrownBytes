const router = require("express").Router();
const User = require("../models").User;
const emailVerifyDb = require("../models").EmailVerification;
const bodyParser = require("body-parser");
const auth = require("../auth");
const nodemailer = require("nodemailer");

router.use(bodyParser.json());

router.post("/signup", (req, res, next) => {
    console.log(req.body);
    (async () => {
        if (req.body.email && req.body.password && req.body.nickName) {
            const hash = auth.hashPassword(req.body.password);
            User.destroy({ where: { email: "qiaonanh@uci.edu" } });
            const user = await User.create({
                email: req.body.email,
                password: hash,
                nickName: req.body.nickName,
            });
            if (user) {
                console.log(user.id);
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json({ message: "Registration success" });
                const host = req.get("host") + req.baseUrl;
                sendEmail(req.body.email, host);
            } else {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.json({ error: "Sign up failed" });
            }
        } else {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.json({ error: "Not all fields are specified" });
        }
    })().catch((err) => {
        console.log(err);
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({ error: "Sign up failed" });
    });
});

router.post("/login", (req, res, next) => {
    console.log(req.body);
    if (req.body.email && req.body.password) {
        (async () => {
            const user = await User.findOne({
                where: {
                    email: req.body.email,
                },
            });
            if (user && user.isActive) {
                if (!auth.verifyPassword(req.body.password, user.password)) {
                    res.statusCode = 401;
                    res.setHeader("Content-Type", "application/json");
                    res.json({ success: false, status: "Incorrect password" });
                }
                let token = auth.getToken({ id: user.id });
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json({
                    success: true,
                    status: "Login Successful!",
                    token: token,
                });
            } else {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.json({ success: false, status: "Account not found" });
            }
        })().catch((err) => {
            console.log(err);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.json({ error: "Login failed" });
        });
    } else {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.json({ success: false, status: "Missing email or password" });
    }
});

router.get("/verify", async (req, res) => {
    const { email, key } = req.query;
    let db_key;
    await emailVerifyDb.findOne({ where: { email } }).then((obj) => {
        if (obj) {
            db_key = obj.key;
        }
    });
    if (key == db_key) {
        res.end("<h1>Email  is been Successfully verified");
        await User.update({ isActive: true }, { where: { email } });
    } else {
        console.log("email is not verified");
        res.end("<h1>Bad Request</h1>");
    }
});

// Email verification
const randomFns = () => {
    let code = "";
    for (let i = 0; i < 10; i++) {
        code += parseInt(Math.random() * 10);
    }
    return code;
};
async function sendEmail(e_mail, host) {
    let smtpTransport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: "brownbytetest",
            pass: "brownbytetestpassword",
        },
    });

    const rand = randomFns();
    const link = `http://${host}/verify?email=${e_mail}&key=${rand}`;
    const mailOptions = {
        to: e_mail,
        subject: "Please confirm your Email account",
        html: `Hello,<br> 
        Please Click on the link to verify your email.<br>
        <a href="${link}">Click here to verify</a> <br>
        This will expire in 5 mins.`,
    };
    console.log(mailOptions);
    smtpTransport.sendMail(mailOptions, async (error, response) => {
        if (error) {
            console.log(error);
            res.end("error");
        } else {
            console.log("Message sent: " + response.message);
            await emailVerifyDb.destroy({ where: { email: e_mail } });
            await emailVerifyDb.create({
                email: e_mail,
                key: rand,
            });
            setTimeout(async () => {
                await emailVerifyDb.destroy({ where: { email: e_mail } });
            }, 1000 * 60 * 5);
        }
    });
}

module.exports = router;
