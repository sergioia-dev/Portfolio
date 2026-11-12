# Repository Pattern Documentation

## Overview

The repository layer provides a data access abstraction that separates the business logic from data storage concerns. This implementation uses the Repository Pattern on top of TypeORM repositories, keeping SQL generation out of controllers.

## Repository Architecture

### Pattern Implementation

```
Controller → Repository → TypeORM Repository → PostgreSQL
     ↓           ↓                ↓                 ↓
Business   Data Access       Entity Mapping     Data Storage
Logic     Abstraction       Query Builder      Persistence
```
Logic     Abstraction    SQL Generation   Persistence
```

### Repository Components

- **blogs_repository.ts**: Blog data operations with multilingual support
- **projects_repository.ts**: Project data operations
- **tags_repository.ts**: Tag data operations

## Design Patterns

### 1. Repository Pattern

**Purpose**: Abstract data access logic
**Implementation**: Repository classes encapsulate all data operations
**Benefits**:

- Testability (mockable data layer)
- Separation of concerns
- Consistent data access interface

### 2. Data Mapper Pattern

**Purpose**: Map database rows to domain objects
**Implementation**: Transform raw database results to structured objects
**Benefits**:

- Clean separation between data and domain models
- Flexible data transformation
- Consistent object structure

### 3. Query Object Pattern

**Purpose**: Encapsulate query logic
**Implementation**: Methods represent specific queries with parameters
**Benefits**:

- Reusable query logic
- Type-safe query parameters
- Clear query intent

## Repository Implementation

### Base Repository Structure

```typescript
// Common repository pattern
import dataSource from "../shared/database/data-source";
import Blog from "../shared/database/content/blog.entity";

const getBlogsByLang = async (language: string) => {
  return dataSource
    .getRepository(Blog)
    .createQueryBuilder("blog")
    .innerJoinAndSelect(
      "blog.translations",
      "translation",
      "translation.language = :language",
      { language },
    )
    .leftJoinAndSelect("blog.tags", "tag")
    .getMany();
};
```

### Blog Repository (`blogs_repository.ts`)

#### Core Operations

> **Get Blogs by Language**

**Features**:

- **JOIN Operation**: Links blogs with translations
- **Language Filtering**: Retrieves content for specific language
- **Tag Enrichment**: Adds associated tags to each blog

> **Get Blogs with Quantity Limit**

**Features**:

- **Pagination**: Limits result count
- **Performance**: Reduces data transfer
- **Consistent Structure**: Same field selection as base query

> **Search Blogs by Title**

**Features**:

- **Case-Insensitive Search**: Uses SQL ILIKE
- **Pattern Matching**: Wildcard search in titles
- **Security**: Match parameter is properly escaped

> **Filter Blogs by Tag**

**Features**:

- **Multi-JOIN**: Links blogs, translations, tags, and relationships
- **Tag Filtering**: Exact tag name matching
- **Complete Data**: Returns all associated tags

> **Combined Tag and Quantity Filter**

**Features**:

- **Combined Filtering**: Tag and quantity limits
- **Optimized Query**: Single query with multiple conditions
- **Consistent Interface**: Same return structure

> **Tag Enrichment Pattern**

```typescript
const enrichWithTags = async (response: any[]) => {
  return await Promise.all(
    response.map(async (row) => {
      const searchTags = await getTagsByBlogsId(row.id);
      searchTags.map((tag) => (tag.name = capitalizeFirstLetter(tag.name)));
      return {
        ...row,
        tags: searchTags,
      };
    }),
  );
};
```

**Features**:

- **Async Processing**: Parallel tag retrieval
- **Data Transformation**: Capitalizes tag names
- **Object Composition**: Adds tags array to each blog

### Project Repository (`projects_repository.ts`)

#### Core Operations

> **Get Projects by Language**

**Features**:

- **Project Data**: Includes website and repository URLs
- **Translation Support**: Multilingual project information
- **Tag Association**: Links projects with tags

> **Project Tag Enrichment**

**Features**:

- **Relationship Query**: Joins project_tags with tags
- **Specific Data**: Returns only tag information
- **ID-Based Filtering**: Retrieves tags for specific project

### Tag Repository (`tags_repository.ts`)

#### Core Operations

> **Get All Tags**

**Features**:

- **Simple Query**: Direct table access
- **Data Transformation**: Capitalizes tag names
- **Complete List**: Returns all available tags

## Data Transformation Patterns

### String Manipulation Utility

```typescript
// util/string_manipulation.ts
function capitalizeFirstLetter(val: String): string {
  val = val.toLowerCase();
  return val.charAt(0).toUpperCase() + val.slice(1);
}
```

**Usage in Repositories**:

- **Tag Names**: Converts database tags to display format
- **Consistent Formatting**: Ensures uniform capitalization
- **Data Presentation**: Prepares data for API responses

### Response Enrichment Pattern

```typescript
// Generic enrichment pattern
const enrichResponse = async (data: any[], enricher: Function) => {
  return await Promise.all(
    data.map(async (item) => {
      const enrichedData = await enricher(item.id);
      return {
        ...item,
        [enricher.property]: enrichedData,
      };
    }),
  );
};
```

## Query Optimization Strategies

### 1. Efficient JOIN Operations

- **Selective Fields**: Only retrieve necessary columns
- **Optimized Conditions**: Proper WHERE clause usage
- **Index Awareness**: Queries designed for database indexes

### 2. Async Processing

- **Parallel Operations**: Promise.all for concurrent data retrieval
- **Non-Blocking**: Async/await pattern throughout
- **Error Handling**: Proper error propagation

### 3. Data Minimization

- **Field Selection**: Explicit field selection in queries
- **Limit Usage**: Pagination for large result sets
- **Conditional Retrieval**: Only retrieve requested data

## Error Handling in Repositories

### Error Propagation Pattern

```typescript
const repositoryOperation = async (params: any) => {
  try {
    const result = await dataSource
      .getRepository(Blog)
      .createQueryBuilder("blog")
      .where("blog.id = :id", { id: params.id })
      .getOne();

    return result;
  } catch (error) {
    // Log database errors
    console.error("Repository error:", error);
    // Re-throw for controller handling
    throw error;
  }
};
```

### Database Error Handling

- **Connection Errors**: Network and authentication issues
- **Query Errors**: SQL syntax and constraint violations
- **Data Errors**: Type mismatches and null values

### Integration Testing

- **Database Integration**: Test with actual database
- **Query Validation**: Verify SQL generation
- **Performance Testing**: Measure query execution time

## Performance Considerations

### Query Performance

- **Index Usage**: Queries designed for database indexes
- **JOIN Optimization**: Efficient join operations
- **Result Limiting**: Pagination for large datasets

### Memory Usage

- **Stream Processing**: For large result sets
- **Connection Pooling**: Database connection management
- **Caching Strategy**: Potential for query result caching

## Best Practices

### 1. Separation of Concerns

- **Data Access Only**: Repositories handle data operations
- **No Business Logic**: Keep business rules in controllers
- **Consistent Interface**: Standardized method signatures

### 2. Error Handling

- **Proper Logging**: Log database errors appropriately
- **Error Propagation**: Let controllers handle error responses
- **Graceful Degradation**: Handle database unavailability

### 3. Performance

- **Query Optimization**: Efficient database queries
- **Connection Management**: Proper connection usage
- **Memory Efficiency**: Avoid loading unnecessary data

### 4. Maintainability

- **Clear Method Names**: Descriptive repository method names
- **Type Safety**: TypeScript interfaces for data structures
- **Documentation**: Clear documentation for complex queries

