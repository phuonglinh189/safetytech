# Digital Technology Adoption Maturity Assessment Tool

A web-based assessment tool for evaluating organizational maturity in digital technology adoption for construction safety monitoring and inspection.

## 🎓 Developed by
- **The University of Manchester**
- **National Taiwan University**

## 📋 Overview

This tool helps construction organizations assess their digital technology adoption maturity across 22 indicators in 4 categories:

1. **Strategy and Commitment** (5 indicators)
2. **Operational Readiness** (7 indicators)
3. **People** (4 indicators)
4. **Technology Integration Preparedness** (6 indicators)

## 🚀 Features

- **Interactive Assessment**: Easy-to-use web interface for self-assessment
- **Customizable Weights**: Configure indicator weights based on organizational priorities
- **Real-time Visualization**: Interactive charts showing category scores and maturity distribution
- **PDF Export**: Generate professional assessment reports
- **5-Level Maturity Model**: Based on Capability Maturity Model (CMM) framework
  - Level 1: Initial
  - Level 2: Managed
  - Level 3: Defined
  - Level 4: Quantitatively Managed
  - Level 5: Optimizing

## 💻 Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Step-by-Step Setup

1. **Navigate to the project directory**
   ```bash
   cd maturity_assessment
   ```

2. **Install required packages**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your web browser**
   Navigate to: `http://127.0.0.1:5000`

## 📖 How to Use

### 1. Configure Indicator Weights

Before starting the assessment:
- Click "Show/Hide Weight Configuration" button
- Adjust weights for each indicator (0.1 to 3.0)
  - Default weight: 1.0
  - Higher weight = more important to your organization
- Adjust category weights for overall score calculation
- Click "Save Weights"

**⚠️ Important**: Configure weights BEFORE completing the assessment for best results.

### 2. Complete the Assessment

For each of the 22 indicators:
- Read all 5 level descriptions carefully
- Select the level that best matches your organization's current state
- Progress bar shows completion status

### 3. Calculate Results

Once all 22 indicators are completed:
- Click "Calculate Maturity Level" button
- View your results including:
  - Overall maturity score and level
  - Category-specific scores
  - Visual charts (bar chart and radar chart)

### 4. Export Report

- Enter your organization name (optional)
- Click "Export Report as PDF"
- Save the professional assessment report

## 📊 Understanding Results

### Overall Maturity Score
- **1.0 - 1.9**: Level 1 - Initial (Ad-hoc processes)
- **2.0 - 2.9**: Level 2 - Managed (Repeatable with basic controls)
- **3.0 - 3.9**: Level 3 - Defined (Standardized processes)
- **4.0 - 4.4**: Level 4 - Quantitatively Managed (Measured and controlled)
- **4.5 - 5.0**: Level 5 - Optimizing (Continuous improvement)

### Category Scores
Each category receives its own score, helping identify:
- Strengths: Categories with higher scores
- Improvement areas: Categories with lower scores

## 🎨 Color Theme

The application uses institutional colors:
- **Purple (#7030A0)**: The University of Manchester
- **Red (#C00000)**: National Taiwan University
- **Gold (#D4A017)**: National Taiwan University
- **Blue (#4472C4)**: Technology category

## 📁 Project Structure

```
maturity_assessment/
│
├── app.py                      # Flask application
├── maturity_data.py           # Indicator definitions and data
├── requirements.txt           # Python dependencies
├── README.md                  # This file
│
├── templates/
│   └── index.html            # Main HTML template
│
└── static/
    ├── css/
    │   └── style.css         # Stylesheet
    └── js/
        └── script.js         # JavaScript functionality
```

## 🔧 Customization

### Modifying Indicators
Edit `maturity_data.py` to:
- Add/remove indicators
- Change level descriptions
- Adjust category colors

### Adjusting Styles
Edit `static/css/style.css` to:
- Change color scheme
- Modify layout
- Adjust fonts and spacing

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 is already in use, modify `app.py`:
```python
app.run(debug=True, port=5001)  # Change to another port
```

### Installation Issues
If you encounter package installation issues:
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Browser Compatibility
Recommended browsers:
- Google Chrome (latest version)
- Mozilla Firefox (latest version)
- Microsoft Edge (latest version)

## 📄 License

This tool is developed for research and educational purposes by The University of Manchester and National Taiwan University.

## 📞 Support

For technical support or questions about the assessment methodology, please contact your project supervisor.

## 🙏 Acknowledgments

Developed as part of a collaborative research project between:
- The University of Manchester
- National Taiwan University

Focus area: Digital Technology Adoption in Construction Safety Monitoring and Inspection

---

**Version**: 1.0  
**Last Updated**: December 2024
