# Back-End Documentation Index

## Overview

This directory contains comprehensive architecture-focused documentation for the back-end API, excluding database implementation details. The documentation covers application architecture, design patterns, and implementation strategies.

## Documentation Structure

```
docs/back-end/
├── README.md                     # This file - Documentation index
├── ARCHITECTURE.md              # Overall system architecture
├── API-REFERENCE.md             # Complete API endpoint documentation
├── CONFIGURATION-SECURITY.md    # Configuration management and security
├── REPOSITORY-PATTERN.md        # Data access layer documentation
├── CONTROLLER-ARCHITECTURE.md   # Request handling and business logic
└── DEPLOYMENT.md                # Deployment strategies and guidelines
```

## Document Descriptions

### 1. [Architecture](./ARCHITECTURE.md)

**Focus**: Overall system architecture and design patterns
**Content**:

- Technology stack overview
- Layered architecture pattern
- Directory structure and organization
- Security architecture
- Performance and scalability considerations
- Design patterns and principles
- Quality attributes and architectural decisions

**Key Sections**:

- 3-tier layered architecture
- Data flow architecture
- Security layers
- Performance optimization strategies
- Multilingual architecture

### 2. [API Reference](./API-REFERENCE.md)

**Focus**: Complete API endpoint documentation with examples
**Content**:

- All RESTful endpoints
- Request/response formats
- Parameter validation rules
- Error handling
- Integration examples
- Rate limiting details

**Key Sections**:

- Blog endpoints (`/blogs`)
- Project endpoints (`/projects`)
- Tag endpoints (`/tags`)
- Response examples
- Integration code samples
- Error handling scenarios

### 3. [Configuration & Security](./CONFIGURATION-SECURITY.md)

**Focus**: Configuration management and security implementation
**Content**:

- Environment-based configuration
- Security middleware stack
- Rate limiting strategies
- Security best practices
- Configuration validation

**Key Sections**:

- Environment configuration
- Security architecture
- Rate limiting implementation
- OWASP compliance
- Configuration management

### 4. [Repository Pattern](./REPOSITORY-PATTERN.md)

**Focus**: Data access layer architecture and patterns
**Content**:

- Repository pattern implementation
- Data mapper pattern
- Query optimization
- Data transformation
- Error handling in repositories
- Performance considerations

**Key Sections**:

- Repository implementation details
- Query object pattern
- Data transformation patterns
- Performance optimization

### 5. [Controller Architecture](./CONTROLLER-ARCHITECTURE.md)

**Focus**: Request handling and business logic architecture
**Content**:

- Controller pattern implementation
- Request processing pipeline
- Input validation strategies
- Error handling patterns
- Response formatting

**Key Sections**:

- Controller implementation
- Parameter validation
- Business logic execution
- Error handling strategy
- Response patterns
- Performance considerations

### 6. [Deployment](./DEPLOYMENT.md)

**Focus**: Deployment strategies and production guidelines
**Content**:

- Production deployment setup
- Docker configuration
- Nginx reverse proxy
- SSL/TLS configuration

**Key Sections**:

- Production deployment
- Docker deployment
- Nginx configuration
- SSL setup

## Architecture Overview

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5.2.1
- **Security**: Helmet.js, CORS, Express Rate Limiter
- **Database Integration**: PostgreSQL via TypeORM

### Architecture Pattern

```
┌─────────────────┐
│   Routes Layer  │  (Request handling & routing)
├─────────────────┤
│ Controllers     │  (Business logic & validation)
├─────────────────┤
│ Repository      │  (Data access abstraction)
├─────────────────┤
│ Database        │  (Data persistence - abstracted)
└─────────────────┘
```

### Key Design Patterns

- **Repository Pattern**: Data access abstraction
- **Controller Pattern**: Request handling
- **Data Mapper Pattern**: Object-relational mapping
- **Query Object Pattern**: Query encapsulation
- **Middleware Pattern**: Cross-cutting concerns

## Quick Start

### For Developers

1. **Architecture**: Start with [Architecture](./ARCHITECTURE.md) to understand the overall system design
2. **API**: Review [API Reference](./API-REFERENCE.md) for endpoint details
3. **Implementation**: Study [Repository Patter](./REPOSITORY-PATTERN.md) and [Controller Architecture](./CONTROLLER-ARCHITECTURE.md) for implementation details

### For API Consumers

1. **Integration**: Use [API-REFERENCE.md](./API-REFERENCE.md) for integration examples
2. **Error Handling**: Review error response formats
3. **Rate Limiting**: Understand rate limiting constraints

## Key Features

### 1. Multilingual Support

- Language-based content retrieval (EN/ES)
- Consistent API across languages
- Validation for language codes

### 2. Security Features

- Rate limiting with progressive delays
- OWASP-compliant security headers
- Input validation and sanitization
- CORS configuration

### 3. Performance Optimization

- Efficient query patterns
- Connection pooling
- Selective data retrieval
- Async processing

### 4. Scalability

- Stateless design
- Modular architecture
- Environment-based configuration
- Rate limiting for resource protection

## API Endpoints Summary

### Blog Management

- `GET /blogs` - Retrieve blogs with filtering options

### Project Management

- `GET /projects` - Retrieve projects with language filtering

### Tag Management

- `GET /tags` - Retrieve all available tags

### Common Features

- Language parameter support (EN/ES)
- Quantity limiting
- Tag-based filtering
- Search functionality (blogs only)

## Configuration Categories

### 1. Environment Configuration

- Development vs production settings
- Database connection parameters
- Server configuration
- Security settings

### 2. Security Configuration

- Rate limiting setup
- CORS policies
- Security headers
- Input validation rules

### 3. Performance Configuration

- Connection pooling
- Query optimization
- Response compression
- Caching strategies

