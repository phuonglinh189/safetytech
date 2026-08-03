"""
Simple JSON-based storage for assessment results
Stores all assessments in assessments.json file
"""
import json
import os
from datetime import datetime
from pathlib import Path

class AssessmentStorage:
    def __init__(self, filename='assessments.json'):
        self.filename = os.path.join(os.path.dirname(__file__), filename)
        self.ensure_file_exists()
    
    def ensure_file_exists(self):
        """Create assessments.json if it doesn't exist"""
        if not os.path.exists(self.filename):
            with open(self.filename, 'w', encoding='utf-8') as f:
                json.dump({'assessments': []}, f, indent=2, ensure_ascii=False)
    
    def save_assessment(self, organization_name, assessor_name, selections, results, language='en'):
        """Save an assessment result"""
        try:
            with open(self.filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except:
            data = {'assessments': []}
        
        assessment = {
            'id': len(data['assessments']) + 1,
            'organization_name': organization_name,
            'assessor_name': assessor_name,
            'language': language,
            'selections': selections,
            'overall_score': results.get('overall_score', 0),
            'maturity_level': results.get('maturity_level', ''),
            'category_scores': results.get('category_scores', {}),
            'created_at': datetime.now().isoformat()
        }
        
        data['assessments'].append(assessment)
        
        with open(self.filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return assessment
    
    def get_all_assessments(self):
        """Retrieve all assessments"""
        try:
            with open(self.filename, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data.get('assessments', [])
        except:
            return []
    
    def get_assessments_by_organization(self, organization_name):
        """Get all assessments for a specific organization"""
        all_assessments = self.get_all_assessments()
        return [a for a in all_assessments if a['organization_name'].lower() == organization_name.lower()]
    
    def get_assessment_by_id(self, assessment_id):
        """Get a specific assessment by ID"""
        all_assessments = self.get_all_assessments()
        for assessment in all_assessments:
            if assessment['id'] == int(assessment_id):
                return assessment
        return None
