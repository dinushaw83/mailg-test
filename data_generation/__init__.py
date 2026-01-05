"""
Fake Data Generator

A utility package for generating fake data based on the database schema.
Supports foreign key relationships and customizable row counts per table.
"""

from .generator import DataGenerator, generate_all, generate_table

__version__ = "1.0.0"
__all__ = ["DataGenerator", "generate_all", "generate_table"]
