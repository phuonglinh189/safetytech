# Sharing the Assessment Tool - Implementation Guide

## How to Share This Website with Your Friend

### Option 1: Local Network Sharing (Easiest for Testing)
**Share within the same WiFi/LAN:**

1. **Find your computer's IP address:**
   - Windows: Open PowerShell and type `ipconfig`
   - Look for IPv4 address (usually 192.168.x.x or 10.x.x.x)

2. **Start the Flask app:**
   ```bash
   cd c:\Users\jacoblab\Downloads\maturity_assessment_tool\maturity_assessment
   python app.py
   ```

3. **Share URL with your friend:**
   - If your IP is `192.168.1.100`, send them:
   - `http://192.168.1.100:5000`

4. **They can now:**
   - Access the assessment from their browser
   - Fill in their organization name and name
   - Complete the assessment
   - Save it to your backend (recorded in `assessments.json`)

---

### Option 2: Cloud Deployment (Best for Production)

#### Deploy to Heroku (Free tier available):

1. **Install Heroku CLI:**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create Procfile:**
   ```
   web: gunicorn app:app
   ```

3. **Add to requirements.txt:**
   ```
   gunicorn
   ```

4. **Deploy:**
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   ```

5. **Share URL:** `https://your-app-name.herokuapp.com`

#### Or Deploy to AWS/Azure/DigitalOcean (Similar process)

---

## Backend Recording System

### What Gets Saved:
Each assessment records:
- ✓ Organization name
- ✓ Assessor name (who filled it)
- ✓ All 22 indicator selections (1-5 levels)
- ✓ Calculated overall score
- ✓ Maturity level
- ✓ Category scores (breakdown)
- ✓ Timestamp

### Where Data is Stored:
- **File:** `assessments.json`
- **Format:** JSON (human-readable, easy to export)
- **Location:** Same directory as `app.py`

### Sample assessments.json structure:
```json
{
  "assessments": [
    {
      "id": 1,
      "organization_name": "ABC Construction Inc",
      "assessor_name": "John Doe",
      "selections": {
        "S1": "4",
        "S2": "3",
        "S3": "3",
        ...
      },
      "overall_score": 3.45,
      "maturity_level": "Level 3: Defined",
      "category_scores": {
        "strategy": {"name": "Strategy and Commitment", "score": 3.5, "color": "#7030A0"},
        ...
      },
      "created_at": "2025-12-11T10:30:45.123456"
    },
    {
      "id": 2,
      "organization_name": "XYZ Safety Systems",
      "assessor_name": "Jane Smith",
      ...
    }
  ]
}
```

---

## API Endpoints for Retrieving Data

### Get All Assessments:
```bash
GET http://localhost:5000/assessments
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "assessments": [...]
}
```

### Get Assessments for Specific Organization:
```bash
GET http://localhost:5000/assessments/ABC%20Construction%20Inc
```

**Response:**
```json
{
  "success": true,
  "organization": "ABC Construction Inc",
  "count": 2,
  "assessments": [...]
}
```

---

## How Your Friend Uses It

1. **Visit the URL** you share with them
2. **Enter their organization name** (e.g., "My Construction Company")
3. **Enter their name** (e.g., "John Doe")
4. **Fill in all 22 indicators** with levels 1-5
5. **Click "Calculate"** to see their maturity assessment
6. **Click "Save Assessment"** to save to your backend
7. **Optionally export PDF** for record-keeping

---

## How You View Results

### Method 1: API Endpoint (JSON format)
```bash
curl http://localhost:5000/assessments
```

### Method 2: Direct File Access
```bash
cat assessments.json
```

### Method 3: Create Admin Dashboard (Optional)
You could add a simple admin page to view results, e.g.:
```
http://localhost:5000/admin/results
```

---

## Comparison of Sharing Options

| Method | Ease | Cost | Security | Best For |
|--------|------|------|----------|----------|
| Local Network | ⭐⭐⭐⭐ | Free | Medium | Team testing |
| Heroku | ⭐⭐⭐ | Free/Paid | Good | Small groups |
| AWS | ⭐⭐ | Paid | Excellent | Enterprise |
| DigitalOcean | ⭐⭐⭐ | Paid | Good | Long-term hosting |

---

## Next Steps

1. **Test locally first:** Run on your machine and have a friend test on same WiFi
2. **Monitor assessments:** Check `assessments.json` for saved results
3. **Analyze trends:** Export data to Excel/BI tools for analysis
4. **Consider database:** Later migrate to SQL database if many responses expected

