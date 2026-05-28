export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  
  return res.status(200).send("12345678,9876543");
}
