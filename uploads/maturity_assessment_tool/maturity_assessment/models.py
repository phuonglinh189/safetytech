"""
Database models for storing assessment results
"""
from datetime import datetime
import json

class AssessmentResult:
    """Model to represent a saved assessment"""
    
    def __init__(self, organization_name, assessor_name, selections, results):
        self.id = None
        self.organization_name = organization_name
        self.assessor_name = assessor_name
        self.selections = selections  # JSON string of indicator selections
        self.overall_score = results.get('overall_score', 0)
        self.maturity_level = results.get('maturity_level', '')
        self.category_scores = results.get('category_scores', {})  # JSON string
        self.created_at = datetime.now().isoformat()
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'organization_name': self.organization_name,
            'assessor_name': self.assessor_name,
            'selections': self.selections,
            'overall_score': self.overall_score,
            'maturity_level': self.maturity_level,
            'category_scores': self.category_scores,
            'created_at': self.created_at
        }
