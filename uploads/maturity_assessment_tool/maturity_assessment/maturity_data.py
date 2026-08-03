"""
Maturity Model Data - All 22 Indicators with 5 Levels
"""

CATEGORIES = {
    "strategy": {
        "name": "Strategy and Commitment",
        "color": "#7030A0",  # Purple from Manchester
        "indicators": [
            {
                "code": "S1",
                "name": "Leadership Commitment",
                "description": "Leadership commitment refers to the extent to which senior leaders endorse, resource, and actively promote digital technologies for construction safety monitoring and inspection.",
                "levels": [
                    "No visible leadership commitment to adopting digital technologies for safety monitoring and inspection.",
                    "Limited leadership commitment. Leaders support or fund isolated technology initiatives in a few projects.",
                    "Moderate leadership commitment. Leaders support technology adoption in some projects, but commitment is not yet embedded across the organisation.",
                    "Strong leadership commitment. Leaders consistently support, promote, and resource technology adoption across all projects.",
                    "Strong and sustained leadership commitment. Leaders consistently support, promote, and resource technology adoption across all projects and use review evidence to drive continuous improvement."
                ]
            },
            {
                "code": "S2",
                "name": "Client's Commitment",
                "description": "Client’s commitment refers to the client's level of support, involvement and investment in the adoption and integration of digital technologies for safety monitoring and inspection.",
                "levels": [
                    "No client commitment to supporting digital technology adoption for safety monitoring and inspection.",
                    "Limited client commitment. Clients support or fund technology adoption in a few projects.",
                    "Moderate client commitment. Clients support technology adoption in some projects, but expectations are not consistently embedded in project requirements.",
                    "Strong client commitment. Clients consistently support, promote, and resource technology adoption across all projects.",
                    "Strong and sustained client commitment. Clients consistently support technology adoption across all projects and review implementation to drive continuous improvement."
                ]
            },
            {
                "code": "S3",
                "name": "Technology Investment Policy",
                "description": "Technology investment policy refers to assessing whether the organization has formal, strategic policies and decision-making procedures for approving, funding, and managing investments in digital safety technologies. This includes risk assessment, regulatory compliance, and long-term planning frameworks that guide responsible and consistent investment behavior.",
                "levels": [
                    "No policy supports investment in digital technologies for safety monitoring and inspection.",
                    "Limited policy support. Investment decisions are made case by case through unstructured decision-making processes.",
                    "A policy exists, but investment decision-making remains unstructured and inconsistently applied.",
                    "A policy exists and investment decision-making is structured, documented, and consistently applied.",
                    "A policy exists and investment decision-making is structured, documented, consistently applied, and routinely refined to improve investment quality."
                ]
            },
            {
                "code": "S4",
                "name": "Education and Training Program",
                "description": "Education and training programs refers to structured programs that train employees on how to use digital safety technologies. These programs aim to build the necessary skills for implementing, operating, and improving safety monitoring and inspection systems on construction sites.",
                "levels": [
                    "No education or training programme supports digital technology implementation for safety monitoring and inspection.",
                    "Basic education and training are provided in limited situations, but there is no structured programme.",
                    "Education and training are commonly provided, but programme design and delivery remain unstructured.",
                    "A structured education and training programme is provided consistently across relevant roles and projects.",
                    "A structured education and training programme is provided consistently and routinely refined using feedback and performance evidence."
                ]
            },
            {
                "code": "S5",
                "name": "Digital Safety Technology Goals Alignment",
                "description": "Digital safety technology goals alignment refer to how well an organization's goals for adopting digital safety technologies align with its overall safety management objectives. It ensures that the use of technology directly supports and enhances safety outcomes, rather than operating separately or without clear direction.",                
                "levels": [
                    "No explicit technology adoption goals are linked to safety management objectives.",
                    "Basic recognition that technology goals should align with safety objectives, but alignment processes are informal and limited.",
                    "Technology goals are linked to safety objectives through unstructured planning and review processes.",
                    "Technology goals are linked to safety objectives through structured planning and review processes.",
                    "Technology goals are linked to safety objectives through structured planning and review processes, which are routinely refined to improve safety outcomes."
                ]
            }
        ]
    },
    "operational": {
        "name": "Operational Readiness",
        "color": "#C00000",  # Red from NTU
        "indicators": [
            {
                "code": "O1",
                "name": "Communication Method",
                "description": "Communication methods refer to how information related to digital safety technologies, such as technical details, terminology, and requirements, is clearly and effectively communicated to workers, stakeholders, and other relevant parties involved in construction safety monitoring and inspection.",                
                "levels": [
                    "No defined communication methods support digital technology implementation for safety monitoring and inspection.",
                    "Basic communication occurs in limited situations, but methods are informal and inconsistently applied.",
                    "Communication about digital safety technologies is common, but methods are not structured or standardised.",
                    "Communication methods are structured, standardised, and consistently used by relevant stakeholders. ",
                    "Structured communication methods are consistently used and routinely reviewed to improve clarity, uptake, and safety outcomes."
                ]
            },
            {
                "code": "O2",
                "name": "Roles and Responsibilities",
                "description": "Roles and responsibilities refer to clearly defined duties assigned to individuals or teams to support digital safety monitoring and inspection. These responsibilities may include tasks such as technology implementation, system maintenance, data analysis, and decision-making to ensure effective safety management on-site.",
                "levels": [
                    "No roles or responsibilities are defined for digital technology implementation in safety monitoring and inspection.",
                    "Basic roles and responsibilities are assigned in limited projects, but assignment processes are informal and depend on individuals or temporary project needs.",
                    "Roles and responsibilities are commonly assigned, but assignment processes remain unstructured.",
                    "Roles and responsibilities are documented, communicated, and consistently assigned through structured processes.",
                    "Roles and responsibilities are documented, communicated, consistently assigned, and routinely reviewed to improve accountability and implementation."
                ]
            },
            {
                "code": "O3",
                "name": "Technology Supplier Management",
                "description": "Technology supplier management refers to how an organization selects, manages, and oversees its technology suppliers. It includes processes for supplier selection, contract management, performance evaluation, compliance monitoring, and strategies for long-term collaboration. These practices help ensure that digital safety technology providers meet quality, reliability, and safety standards.",
                "levels": [
                    "No technology supplier management process supports digital technology implementation for safety monitoring and inspection.",
                    "Basic supplier management is conducted in limited cases, but processes are informal and depend mainly on individual decisions.",
                    "Supplier management is commonly conducted, but supplier selection, contracting, performance review, and compliance monitoring remain unstructured.",
                    "Supplier selection, contract management, performance review, and compliance monitoring are structured and consistently applied.",
                    "Structured supplier management processes are consistently applied and routinely reviewed to strengthen reliability, quality, compliance, and long-term collaboration."
                ]
            },
            {
                "code": "O4",
                "name": "Operation Control",
                "description": "Operational controls refer to the systems, processes, and guidelines in place to ensure that safety monitoring and inspection teams can use digital technologies effectively, reliably, and without interruption throughout their implementation on-site.",
                "levels": [
                    "No operational controls support digital technology implementation for safety monitoring and inspection.",
                    "Basic operational controls are applied in limited projects, but processes are informal and rely mainly on individual experience.",
                    "Operational controls are commonly applied, but control processes remain unstructured.",
                    "Operational controls are documented, structured, and consistently applied across relevant projects.",
                    "Operational controls are documented, structured, consistently applied, and routinely improved using operational evidence."
                ]
            },
            {
                "code": "O5",
                "name": "Performance Evaluation",
                "description": "Performance evaluation refers to the process of assessing whether the adoption of digital safety technologies has met the intended goals related to safety monitoring and inspection.",
                "levels": [
                    "No performance evaluation assesses whether digital safety technology adoption has met its intended objectives.",
                    "Basic performance evaluation occurs in limited cases, but evaluation processes are informal and depend mainly on individual judgement.",
                    "Performance is commonly assessed, but evaluation processes remain unstructured.",
                    "Performance evaluation is structured, with defined criteria, metrics, and review points.",
                    "Performance evaluation is structured, with defined criteria, metrics, and review points; findings are routinely used to improve implementation and safety outcomes."
                ]
            },
            {
                "code": "O6",
                "name": "Data Management",
                "description": "Data management refers to the policies and procedures for handling data collected by digital safety technologies. It includes how data is collected, stored, analyzed, protected, and used to support safety decision-making and ensure regulatory compliance.",
                "levels": [
                    "No data management process supports the use of digital safety technologies in safety monitoring and inspection.",
                    "Data from digital safety technologies are handled in limited cases, but processes are informal and depend mainly on individual practices.",
                    "Data from digital safety technologies are commonly handled, but data management processes remain unstructured.",
                    "Data management processes are documented, structured, and consistently applied.",
                    "Data management processes are documented, structured, consistently applied, and routinely reviewed to improve data quality, security, and decision-making."
                ]
            },
            {
                "code": "O7",
                "name": "Knowledge Sharing",
                "description": "Knowledge sharing refers to assessing whether experiences, challenges, lessons learned, and best practices from the use of digital safety technologies are systematically documented and shared across teams. This promotes continuous learning, avoids repeated mistakes, and supports better adoption across projects.",
                "levels": [
                    "No knowledge sharing process supports digital technology implementation for safety monitoring and inspection.",
                    "Experience and lessons learned are shared informally in limited cases, but knowledge sharing depends mainly on individual effort.",
                    "Experience, lessons learned, and good practice are commonly shared, but knowledge sharing processes remain unstructured.",
                    "Knowledge sharing processes are documented, structured, and consistently applied across projects and teams.",
                    "Knowledge sharing processes are documented, structured, consistently applied, and routinely improved so that lessons inform future deployments, training, and decision-making."
                ]
            }
        ]
    },
    "people": {
        "name": "People",
        "color": "#D4A017",  # Gold from NTU
        "indicators": [
            {
                "code": "P1",
                "name": "Employee Willingness",
                "description": "Employee willingness refers to how open and willing employees are to participate in and adopt digital technologies used for safety monitoring and inspection on construction sites.",
                "levels": [
                    "Employees show no awareness of, acceptance of, or willingness to use digital safety technologies.",
                    "Limited employee willingness. Employees are aware of, and may participate in, technology use in a few projects.",
                    "Moderate employee willingness. Employees accept and support technology use in several projects, but participation is not consistent across the organisation.",
                    "Strong employee willingness. Employees accept, support, and participate in technology use across all relevant projects.",
                    "Strong employee willingness. Employees accept, support, and participate in technology use across all relevant projects and actively contribute to continuous improvement by sharing feedback, encouraging adoption, and identifying ways to improve technology use over time."
                ]
            },
            {
                "code": "P2",
                "name": "Current Technical Competency",
                "description": "Current technical competency refers to measuring the current level of technical skill and hands-on experience that employees (e.g., safety officers, field staff) have in using digital safety technologies. It reflects whether the existing workforce is equipped to operate and manage these tools effectively today.",
                "levels": [
                    "Employees have no technical knowledge, skills, or hands-on experience in using digital safety technologies.",
                    "Employees have limited experience with digital safety technologies and cannot use or troubleshoot the technologies independently.",
                    "Employees have sufficient skills to use digital safety technologies independently, but have limited ability to troubleshoot technical issues.",
                    "Employees have sufficient skills to use and troubleshoot digital safety technologies independently.",
                    "Employees have sufficient skills to use and troubleshoot digital safety technologies independently and actively contribute to continuous improvement by sharing lessons learned, refining practices, and updating their skills over time."
                ]
            },
            {
                "code": "P3",
                "name": "Ongoing Learning and Skills Development",
                "description": "Ongoing learning and skills develop refers to evaluating whether employees actively engage in learning opportunities to improve their understanding and use of digital safety technologies. It considers their participation in training, willingness to upskill, and ability to keep pace with evolving tech.",
                "levels": [
                    "Employees do not have access to learning opportunities that improve their understanding or use of digital safety technologies.",
                    "Basic collaboration occurs in limited situations, but it is informal and depends mainly on individual relationships.",
                    "Collaboration commonly occurs, but collaboration processes remain unstructured.",
                    "Cross-role collaboration is structured through defined communication channels, coordination processes, and support arrangements.",
                    "Cross-role collaboration is structured, consistently applied, and routinely reviewed to improve coordination, adoption, and safety outcomes."
                ]
            },
            {
                "code": "P4",
                "name": "Collaboration Across Roles and Teams",
                "description": "Collaboration across roles and teams refers to how well individuals from different roles—such as safety officers, field workers, supervisors, and IT staff—collaborate when using or implementing digital safety technologies. It considers their ability to communicate, coordinate tasks, and support each other across functions.",
                "levels": [
                    "No cross-role or cross-team collaboration supports digital technology implementation in safety monitoring and inspection.",
                    "Basic collaboration occurs in limited situations, but it is informal and depends mainly on individual relationships.",
                    "Collaboration commonly occurs, but collaboration processes remain unstructured.",
                    "Cross-role collaboration is structured through defined communication channels, coordination processes, and support arrangements.",
                    "Cross-role collaboration is structured, consistently applied, and routinely reviewed to improve coordination, adoption, and safety outcomes."
                ]
            }
        ]
    },
    "technology": {
        "name": "Technology Integration",
        "color": "#4472C4",  # Blue
        "indicators": [
            {
                "code": "T1",
                "name": "Technology Budget",
                "description": "Technology Budget refers to evaluating the organization's ability to plan, allocate, and manage financial resources for the entire lifecycle of digital safety technologies. This includes upfront costs, ongoing maintenance, operations, depreciation, and potential reuse, ensuring that the technology is financially sustainable in practice.",
                "levels": [
                    "Budget planning for digital safety technologies is not conducted. No dedicated budget is allocated for acquisition, implementation, operation, maintenance, upgrades, or reuse.",
                    "Budget planning for digital safety technologies is conducted in a few projects, but remains ad hoc, project-specific, and dependent on individual judgement.",
                    "Budget planning for digital safety technologies is conducted across several projects, but remains locally defined and inconsistently applied.",
                    "Budget planning for digital safety technologies is governed by an organisation-wide approach and consistently applied across relevant projects.",
                    "Budget planning for digital safety technologies is governed by an organisation-wide approach, consistently applied across relevant projects, and routinely reviewed to improve affordability, sustainability, and return on investment."
                ]
            },
            {
                "code": "T2",
                "name": "Technical Operation Complexity",
                "description": "The operational complexity refers to evaluating the organization's readiness to manage and operate digital safety technologies on-site. It considers whether personnel have the skills, training, and support systems needed to use hardware and software effectively, especially when the technology has complex interfaces or processes.",
                "levels": [
                    "No consideration is given to the operational complexity of digital safety technologies.",
                    "Operational complexity is recognised in limited cases, but assessment processes are informal and depend mainly on individual experience.",
                    "Operational complexity is commonly assessed, but assessment processes remain unstructured.",
                    "Operational complexity is assessed through structured criteria before and during implementation.",
                    "Structured complexity assessments are routinely reviewed and used to simplify use, improve support, and reduce operational burden."
                ]
            },
            {
                "code": "T3",
                "name": "Technology Reliability",
                "description": "Technical reliability refers to assessing the organization's ability to select, implement, and maintain technologies that consistently provide accurate, stable, and timely data for safety monitoring and decision-making. It reflects how well the organization can manage reliability risks during real-world use.",
                "levels": [
                    "No consideration is given to technology reliability when adopting digital safety technologies.",
                    "Technology reliability is recognised in limited cases, but assessment processes are informal and depend mainly on individual experience.",
                    "Technology reliability is commonly assessed, but assessment processes remain unstructured.",
                    "Technology reliability is assessed through structured criteria and consistently monitored during implementation.",
                    "Structured reliability assessments are consistently applied and routinely reviewed to improve accuracy, stability, timeliness, and decision usefulness."
                ]
            },
            {
                "code": "T4",
                "name": "Technology Resilience",
                "description": "Technical resilience refers to measuring how prepared the organization is to deploy technologies that can withstand the harsh and variable conditions of construction sites. It evaluates whether the organization considers durability, long-term use, and environmental resilience when adopting digital safety tools.",
                "levels": [
                    "No consideration is given to technology resilience when adopting digital safety technologies.",
                    "Technology resilience is recognised in limited cases, but assessment processes are informal and depend mainly on individual experience.",
                    "Technology resilience is commonly assessed, but assessment processes remain unstructured.",
                    "Technology resilience is assessed through structured criteria covering durability, environmental conditions, maintenance, and long-term use.",
                    "Structured resilience assessments are consistently applied and routinely reviewed to improve durability, maintainability, and suitability for site conditions."
                ]
            },
            {
                "code": "T5",
                "name": "Technology Compatibility",
                "description": "Technology compatibility refers to assessing the organization's ability to integrate new digital safety technologies with its existing systems, platforms, and workflows. It reflects how well-prepared the organization is to adopt new tools without disrupting current operations or creating inefficiencies.",
                "levels": [
                    "No consideration is given to technology compatibility when adopting digital safety technologies.",
                    "Technology compatibility is recognised in limited cases, but assessment processes are informal and depend mainly on individual experience.",
                    "Technology compatibility is commonly assessed, but assessment processes remain unstructured.",
                    "Technology compatibility is assessed through structured criteria covering interoperability, workflow fit, and integration requirements.",
                    "Structured compatibility assessments are consistently applied and routinely reviewed to improve integration, interoperability, and workflow fit."
                ]
            },
            {
                "code": "T6",
                "name": "Infrastructure",
                "description": "Infrastructure refers to assesses whether the organization's existing infrastructure, such as hardware, network connectivity, data platforms, and IT support systems, is capable of supporting the adoption, integration, and ongoing operation of digital safety technologies. It helps determine if upgrades or adjustments are needed to ensure new technologies can function effectively within the current technical environment.",
                "levels": [
                    "No consideration is given to infrastructure readiness for digital safety technology implementation.",
                    "Basic efforts are made to prepare infrastructure in limited cases, but preparation processes are informal and depend mainly on individual experience.",
                    "Infrastructure is commonly prepared, but preparation processes remain unstructured.",
                    "Infrastructure preparation is structured and consistently applied across relevant projects.",
                    "Infrastructure preparation is structured, consistently applied, and routinely reviewed to improve reliability, scalability, and implementation readiness."
                ]
            }
        ]
    }
}

LEVEL_NAMES = [
    "Level 1: Initial",
    "Level 2: Managed",
    "Level 3: Defined",
    "Level 4: Quantitatively Managed",
    "Level 5: Optimizing"
]
