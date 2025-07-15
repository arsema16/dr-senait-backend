import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import multer from 'multer';
import path, { join } from 'path'; // make sure you're importing 'join'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();
const app = express();
const PORT = 5000;
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Schemas
const appointmentSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  service: String,
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const blogSchema = new mongoose.Schema({
  title: String,
  date: String,
  image: String,
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const openHourSchema = new mongoose.Schema({
  day: String,
  open: String,
  close: String
});

// Models
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Message = mongoose.model('Message', messageSchema);
const Blog = mongoose.model('Blog', blogSchema);
const OpenHour = mongoose.model('OpenHour', openHourSchema);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Serve uploaded images

// Multer Config for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Routes

// Appointments
app.post('/api/appointments', async (req, res) => {
  const { name, phone, date, service } = req.body;
  if (!name || !phone || !date || !service) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const appointment = new Appointment({ name, phone, date, service });
    await appointment.save();
    res.status(201).json({ message: 'Appointment saved successfully', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  const appointments = await Appointment.find().sort({ createdAt: -1 });
  res.json(appointments);
});

// Messages
app.post('/api/messages', async (req, res) => {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const newMessage = new Message({ name, email, phone, message });
    await newMessage.save();
    res.status(201).json({ message: 'Message received successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/messages', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
});

// Blogs
app.post('/api/blogs', async (req, res) => {
  const { title, date, image, content } = req.body;
  if (!title || !date || !image || !content) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    const newBlog = new Blog({ title, date, image, content });
    await newBlog.save();
    res.status(201).json({ message: 'Blog created successfully', blog: newBlog });
  } catch (err) {
    res.status(500).json({ message: 'Error creating blog', error: err.message });
  }
});

// ✅ Correct blog route
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog) {
      res.json(blog);
    } else {
      res.status(404).json({ message: 'Blog not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find({}, 'title date image content').sort({ createdAt: -1 }); // get selected fields
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




app.put('/api/blogs/:id', async (req, res) => {
  try {
    const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedBlog);
  } catch (err) {
    res.status(500).json({ message: 'Error updating blog', error: err.message });
  }
});

app.delete('/api/blogs/:id', async (req, res) => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting blog', error: err.message });
  }
});

// Open Hours
app.get('/api/open-hours', async (req, res) => {
  const hours = await OpenHour.find();
  res.json(hours);
});

app.post('/api/open-hours', async (req, res) => {
  const { day, open, close } = req.body;
  try {
    const existing = await OpenHour.findOneAndUpdate(
      { day },
      { open, close },
      { new: true, upsert: true }
    );
    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: 'Error saving open hour', error: err.message });
  }
});

app.put('/api/open-hours/:id', async (req, res) => {
  const { day, open, close } = req.body;
  try {
    const updated = await OpenHour.findByIdAndUpdate(
      req.params.id,
      { day, open, close },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Error updating open hour', error: err.message });
  }
});

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ url: imageUrl });
});

// Export to Excel
app.get('/api/export/:type', async (req, res) => {
  const type = req.params.type;
  let data = [];

  if (type === 'appointments') {
    data = await Appointment.find();
  } else if (type === 'messages') {
    data = await Message.find();
  } else if (type === 'blogs') {
    data = await Blog.find();
  } else {
    return res.status(400).json({ message: 'Invalid export type' });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);

  if (data.length === 0) {
    return res.status(404).json({ message: 'No data found to export.' });
  }

  const keys = Object.keys(data[0].toObject()).filter(k => k !== '__v' && k !== '_id');
  worksheet.columns = keys.map(key => ({ header: key.toUpperCase(), key }));

  data.forEach(item => {
    worksheet.addRow(item.toObject());
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${type}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
