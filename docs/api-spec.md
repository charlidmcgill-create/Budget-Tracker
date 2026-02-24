# API Specifications

All of these methods are found in the app.js file.

## Authentication Endpoints

### POST /auth/login

Authenticates a user and returns a JWT token.

**Request Body:**

```json
{
    "username": "string",
    "password": "string"
}
```

**Response (200):**

```json
{
    "token": "string",
    "user": {
        "id": "number",
        "username": "string"
    }
}
```

### POST /auth/register

Registers a new user account.

**Request Body:**

```json
{
    "username": "string",
    "email": "string",
    "password": "string",
    "confirmPassword": "string"
}
```

**Response (201):**

```json
{
    "message": "User registered successfully",
    "token": "string",
    "user": {
        "id": "number",
        "username": "string",
        "email": "string"
    }
}
```

## Transaction Endpoints

### GET /transactions

Retrieves all transactions ordered by date (newest first). Requires authentication.

**Response (200):**

```json
[
    {
        "id": "number",
        "date": "string",
        "amount": "number",
        "category": "string",
        "description": "string"
    }
]
```

### POST /transactions/batch

Creates multiple transactions in a single request. Requires authentication.

**Request Body:**

```json
{
    "transactions": [
        {
            "date": "string",
            "amount": "number",
            "category": "string",
            "description": "string"
        }
    ]
}
```

**Response (200):**

```json
{
    "message": "Batch of transactions has been saved",
    "count": "number",
    "transactions": []
}
```

### PUT /transactions/:id

Updates a specific transaction. Requires authentication.

**Response (200):**

```json
{
    "message": "Transaction with ID {id} has been updated",
    "transaction": {}
}
```

### DELETE /transactions/:id

Deletes a specific transaction. Requires authentication.

**Response (200):**

```json
{
    "message": "Transaction with ID {id} has been deleted"
}
```

## Import & Summary Endpoints

### POST /imports

Uploads and processes a CSV file of transactions. Requires authentication.

**Response (200):**

```json
{
    "message": "CSV imported successfully",
    "count": "number"
}
```

### GET /summary/monthly

Retrieves income and expense summaries by month. Requires authentication.

**Query Parameters:**

- `year` (optional): number
- `month` (optional): number

**Response (200):**

```json
{
    "income": "number",
    "expenses": "number"
}
```
