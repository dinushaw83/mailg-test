"""
Schema Inference Engine for automatic generation rule detection.

This module analyzes JSON schemas to infer:
- Field semantics and relationships
- Cross-field consistency rules
- Conditional generation patterns
- Domain-specific value generation strategies
"""

from .engine import SchemaInferenceEngine, analyze_schema_file
from .domain import DomainDetector, Domain, DOMAIN_VOCABULARIES
from .patterns import PatternDetector, TablePatterns
from .rules import InferredRules, FieldRule, ConsistencyRule, RuleType, GenerationStrategy
from .generators import InferenceAwareGenerator

__all__ = [
    # Main engine
    "SchemaInferenceEngine",
    "analyze_schema_file",
    # Domain
    "DomainDetector",
    "Domain",
    "DOMAIN_VOCABULARIES",
    # Patterns
    "PatternDetector",
    "TablePatterns",
    # Rules
    "InferredRules",
    "FieldRule",
    "ConsistencyRule",
    "RuleType",
    "GenerationStrategy",
    # Generators
    "InferenceAwareGenerator",
]
