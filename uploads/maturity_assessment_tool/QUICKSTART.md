# Quick Start: Share Assessment & Track Results

## 🚀 Quick Setup (5 minutes)

### 1. Install New Dependencies
```bash
cd c:\Users\jacoblab\Downloads\maturity_assessment_tool\maturity_assessment
pip install -r requirements.txt
```

### 2. Start the App
```bash
python app.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

---

## 📋 What's New

### For Your Friends (Assessment Interface)
- They enter **Organization Name** and **Assessor Name**
- They complete the 22-indicator assessment
- They click **"Save Assessment"** to submit their results
- Optional: Export as PDF

### For You (Backend Recording)
- All assessments automatically saved to `assessments.json`
- Access admin dashboard to view all results
- API endpoints to retrieve data programmatically

---

## 🌐 Three Ways to Share

### **Method 1: Local Network (EASIEST)**
Works on same WiFi/LAN, perfect for initial testing:

1. Find your IP:
   ```powershell
   ipconfig
   # Look for IPv4 like 192.168.1.100
   ```

2. Send to friend: `http://192.168.1.100:5000`

3. They fill assessment and save
   
4. Check results in dashboard: `http://192.168.1.100:5000/dashboard`

---

### **Method 2: Port Forwarding (INTERMEDIATE)**
If friend is outside your network:

1. Configure port forwarding on router (forward port 5000)

2. Get public IP: Visit https://whatismyipaddress.com

3. Send: `http://[your-public-ip]:5000`

⚠️ **Note:** This exposes your computer. Use Method 3 for production.

---

### **Method 3: Cloud Deployment (BEST)**
Heroku free tier or AWS:

```bash
# Install Heroku CLI first
heroku login
heroku create your-app-name
git push heroku main
```

Share: `https://your-app-name.herokuapp.com`

---

## 📊 Viewing Results

### **Option A: Admin Dashboard (Visual)**
Visit: `http://localhost:5000/dashboard`

Shows:
- ✓ Total assessments count
- ✓ Average maturity score
- ✓ Number of organizations
- ✓ Table of all assessments
- ✓ Click "Details" to see breakdown

### **Option B: API (Programmatic)**

Get all assessments:
```bash
curl http://localhost:5000/assessments
```

Get specific organization:
```bash
curl "http://localhost:5000/assessments/ABC%20Construction"
```

### **Option C: JSON File (Direct)**
```bash
cat assessments.json
```

---

## 📁 File Structure

```
maturity_assessment/
├── app.py                      # Main Flask app (UPDATED)
├── storage.py                  # Data persistence (NEW)
├── global_weights.json         # Indicator weights
├── assessments.json            # ✓ SAVED ASSESSMENTS GO HERE
├── maturity_data.py
├── requirements.txt
├── templates/
│   ├── index.html             # Assessment form (UPDATED)
│   └── dashboard.html         # Results dashboard (NEW)
├── static/
│   ├── css/
│   ├── js/
│   │   └── script.js          # (UPDATED - save function)
│   └── images/
```

---

## 🔄 Data Flow

```
Friend fills assessment
        ↓
[Clicks "Save Assessment"]
        ↓
POST /save_assessment (JSON)
        ↓
storage.py processes
        ↓
Saved to assessments.json
        ↓
You view in dashboard or API
```

---

## 📈 Sample Assessment Saved

```json
{
  "id": 1,
  "organization_name": "ABC Construction Ltd",
  "assessor_name": "John Doe",
  "overall_score": 3.45,
  "maturity_level": "Level 3: Defined",
  "selections": {
    "S1": "4",
    "S2": "3",
    "S3": "3",
    ... (all 22 indicators)
  },
  "category_scores": {
    "strategy": {"score": 3.5, ...},
    "operational": {"score": 3.2, ...},
    "people": {"score": 3.6, ...},
    "technology": {"score": 3.4, ...}
  },
  "created_at": "2025-12-11T14:30:45.123456"
}
```

---

## ✅ Testing Checklist

- [ ] App starts without errors
- [ ] Can fill assessment form on friend's computer
- [ ] "Save Assessment" button works
- [ ] Dashboard shows saved assessment
- [ ] API returns correct data
- [ ] assessments.json has new entry

---

## 🛠️ Troubleshooting

**"Connection refused"**
- Make sure Flask app is running
- Check firewall allows port 5000

**"Can't access from friend's computer"**
- Check both on same WiFi
- Verify IP address with `ipconfig`
- Try `http://localhost:5000` on same computer first

**"Save button doesn't work"**
- Check browser console (F12) for errors
- Ensure Organization Name and Assessor Name filled
- Ensure assessment calculated first

**"assessments.json not appearing"**
- Save button should create it automatically
- Check app directory for the file
- Look for error messages in Flask console

---

## 🎯 Next Steps

1. **Test locally first** with a friend on same WiFi
2. **Monitor assessments.json** for growth
3. **Consider cloud deployment** for permanent sharing
4. **Set up automated exports** (e.g., to Excel weekly)
5. **Add authentication** if collecting sensitive data

---

## 📞 Need Help?

Check `SHARING_GUIDE.md` for detailed deployment instructions!
