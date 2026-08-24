// ================= ================= =================
// TELEGRAM MINI APP BACK-END (server.js)
// ================= ================= =================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. MONGODB ATLAS WAJJIN WAL-QABSIISUU
// Password kee isa MongoDB Atlas irratti uumte iddoo <PASSWORD_KEE> jedhutti bakka buusi.
const MONGO_URI = "mongodb+srv://geleta:<PASSWORD_KEE>@cluster0.mongodb.net/lucky_app?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB wajjin milkaa'inaan wal-qabateera!'))
  .catch((err) => console.error('Error MongoDB:', err));

// 2. USER SCHEMA (Odeeffannoo Maamilaa Kuusuuf)
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: String,
  balance: { type: Number, default: 0 },
  spinCount: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  banUntil: { type: Date, default: null }
});

const User = mongoose.model('User', userSchema);

// 3. TICKET SCHEMA (Tiketiwwan Bitaman To'achuuf)
const ticketSchema = new mongoose.Schema({
  categoryId: { type: String, required: true }, // Fkn: 'week1', 'month1', 'phone'
  ticketNumber: { type: Number, required: true },
  userId: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// ================= ================= =================
// API ENDPOINTS (ROUTE-OOTA FRONT-END WAJJIN DUBAATAN)
// ================= ================= =================

// A. USER INITIALIZE (Akkuma Seenaniin Galmeessuu/Akkawuntii Banuu)
app.post('/api/user/init', async (req, res) => {
  const { telegramId, name } = req.body;
  try {
    let user = await User.findOne({ telegramId });
    
    // Yoo Banned ta'e check gochuu
    if (user && user.isBanned && user.banUntil > new Date()) {
      return res.status(403).json({ error: "Akkawuntiin keessan yeroof sa'aatii 5f Cufameera (Banned)." });
    }

    if (!user) {
      user = new User({ telegramId, name, balance: 0 });
      await user.save();
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// B. SPIN WHEEL LOGIC (Seera Spin Naannessuu To'achuu)
app.post('/api/spin', async (req, res) => {
  const { telegramId } = req.body;
  try {
    const user = await User.findOne({ telegramId });
    
    if (!user || user.balance < 5) {
      return res.status(400).json({ error: "Balance keessan 5 Br ol ta'uu qaba!" });
    }

    // 5 Birr Balance irraa hir'isuu
    user.balance -= 5;
    user.spinCount += 1;

    let prize = 0;
    const count = user.spinCount;

    // Seera Spin
    if (count === 2) prize = 15;
    else if (count === 3) prize = 10;
    else if (count === 20) prize = 50;
    else if (count === 50) prize = 150;
    else {
      // Prize xiqqaawwan random
      const prizes = [3, 5, 10];
      prize = prizes[Math.floor(Math.random() * prizes.length)];
    }

    user.balance += prize;
    await user.save();

    res.json({ prize, newBalance: user.balance, spinCount: user.spinCount });
  } catch (err) {
    res.status(500).json({ error: "Spin Error" });
  }
});

// C. TICKET BUYING LOGIC (Tiketii Bitachuu & Duplicate Dhoorkuu)
app.post('/api/ticket/buy', async (req, res) => {
  const { telegramId, categoryId, ticketNumber, price } = req.body;

  try {
    const user = await User.findOne({ telegramId });

    if (!user || user.balance < price) {
      return res.status(400).json({ error: `Maalo Tiket murachuuf Haften Herrega keessanii gahaa miti! Herrega guutun Tiket carraa bitadhaa.` });
    }

    // Tiketiin kun kanaan dura filatameera?
    const existingTicket = await Ticket.findOne({ categoryId, ticketNumber });
    if (existingTicket) {
      return res.status(400).json({ error: "Maaloo lakkoofsi tiket kun durse isin dura filatameera, maaloo lakkoofsa biroo ykn tiket biroo muradhaa." });
    }

    // Balance hir'isuu fi Tiketii Save gochuu
    user.balance -= price;
    await user.save();

    const newTicket = new Ticket({ categoryId, ticketNumber, userId: telegramId });
    await newTicket.save();

    res.json({ message: "Tiketiin milkaa'inaan bitameera!", newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ error: "Ticket Purchase Error" });
  }
});

// D. GET ALL BOOKED TICKETS (Tiketiwwan Filataman ✅ fi ◼️ Identfy Gochuuf)
app.get('/api/tickets/:categoryId', async (req, res) => {
  try {
    const tickets = await Ticket.find({ categoryId: req.params.categoryId });
    const bookedNumbers = tickets.map(t => t.ticketNumber);
    res.json(bookedNumbers);
  } catch (err) {
    res.status(500).json({ error: "Fetch Tickets Error" });
  }
});

// SERVER HOJJECHIISUU
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server-ni Port ${PORT} irratti hojjetaa jira...`);
});
