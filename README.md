# Bank PDF Statement Parser API

> [!WARNING]  
> PDF Parsing is best done with Computer Vision / Machine Learning powered approaches (eg. [camelot](https://github.com/atlanhq/camelot))  
> This project is meant to be a simple string parsing with the help of PDF2JSON library.

This API allows users to upload bank PDF statements and converts them into CSV/JSON format. The requests are handled asynchronously using a queuing system to ensure scalability and reliability even under heavy load.

## Features

- **Asynchronous Processing**: PDF parsing jobs are queued and processed by worker processes, allowing the system to handle a large number of requests without overwhelming the server.
- **Polling for Job Status**: Users can continuously poll the API to check the status of their parse jobs.
- **Flexible Output**: The parsed data can be retrieved in either CSV or JSON format.

## How it works

- Text extraction: The PDF is parsed using a library like [pdf2json](https://www.npmjs.com/package/pdf2json) to extract the text from the PDF.
- Column Extraction: The extracted text is then parsed to extract the transactions. We are expecting the following columns:
  - Date
  - Value Date
  - Cheque Number / Ref No / Tran. No
  - Description / Memo / Note / Details / Narration
  - Credit / Deposit
  - Debit / Withdrawal
  - Balance  
  We identify the line number of the text where the column headers are present.
- Row Extraction: Text elements coming under the column headers are grouped together and parsed to extract the transactions with the help of their X-Y coordinates.

## Table of Contents

- [Supported Banks](#supported-banks)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Job Lifecycle](#job-lifecycle)
- [Contributing](#contributing)
- [License](#license)

## Supported Banks
- [State Bank of India](https://www.sbi.co.in/)
- [HDFC Bank](https://www.hdfcbank.com/)
- [ICICI Bank](https://www.icicibank.com/)

Support for other banks can be added in the future.

## Technology Stack

- Backend: Node.js (TypeScript) with Express for handling HTTP requests.
- Queue: [Bee-Queue](https://github.com/bee-queue/bee-queue) for handling asynchronous processing of PDF files.
- File Storage: Local filesystem for storing PDF files and parsed results.  
  Can be extended to use AWS S3 or other cloud storage providers in the future.
- Database: Redis for storing job status and queue metadata.

## Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/fahimalizain/bank-pdf-statements.git
    cd bank-pdf-statements
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Configure environment variables:**
    Create a `.env` file based on the `.env.example` and set your environment variables.
    ```bash
    # Redis Configuration (for both database and Bee-Queue)
    REDIS_HOST=localhost
    REDIS_PORT=6379
    REDIS_PASSWORD=your_redis_password

    # Queue Configuration
    QUEUE_NAME=pdf_parse_queue

    # File Storage Configuration
    # If using local file system, specify a directory path
    FILE_STORAGE_PATH=./uploads

    # If planning to use S3 in the future, you can include these (commented out for now)
    # AWS_ACCESS_KEY_ID=your_access_key
    # AWS_SECRET_ACCESS_KEY=your_secret_key
    # S3_BUCKET_NAME=your_bucket_name

    # Server Configuration
    PORT=3000
    NODE_ENV=development

    # Logging Configuration
    LOG_LEVEL=info

    # Authentication API Key
    AUTH_API_KEY=your_api_key
    ```

4. **Run the application:**
    ```bash
    npm start
    ```

5. **Run the worker process:**
    ```bash
    npm run worker
    ```

## Usage

1. **Start the server:**
    ```bash
    npm start
    ```

2. **Start the worker(s):**
    ```bash
    npm run worker
    ```

3. **Use the API to upload PDFs and check the status of parse jobs.**

## Authentication

The API expects a fixed API key to be sent in the `Authorization` header. You can set the API key in the `.env` file or as an environment variable.

## API Endpoints

<details>
<summary>Common Error Responses</summary>

- **AuthError:** Authentication failed.
    ```jsonc
    // HTTP Status Code: 401
    {
        "error": "AuthError",
        "message": "Authentication failed. Please check your API key."
    }
    ```
- **JobNotFoundError:** The job with the specified ID was not found.
    ```jsonc
    // HTTP Status Code: 404
    {
        "error": "JobNotFoundError",
        "message": "Job not found."
    }
    ```
- **ServerError:** An internal server error occurred.
    ```jsonc
    // HTTP Status Code: 500
    {
        "error": "ServerError",
        "message": "An internal server error occurred."
    }
    ```
</details>

<details>
<summary>Upload PDF and Create Parse Job</summary>

- **Endpoint:** `POST /api/v1/statements`
- **Description:** Upload a PDF file to create a parsing job.
- **Request Body:** 
    - Multipart form-data with the key `file` containing the PDF.
    - Optional `outputFormat` parameter to specify the output format (csv or json) default is csv.
- **Response:**
    ```json
    {
        "job_id": "12345",
        "status": "queued",
        "message": "Job has been created and added to the queue."
    }
    ```
- **Response (InvaldFileError):**
    ```jsonc
    // HTTP Status Code: 400
    {
        "error": "InvalidFileError",
        "message": "Invalid file type. Only PDF files are allowed."
    }
    ```
</details>

<details>
<summary>Check Job Status</summary>

- **Endpoint:** `GET /api/v1/statements/{jobId}/status`
- **Description:** Poll the status of a parse job.
- **Response (queued):**
    ```json
    {
        "jobId": "12345",
        "status": "queued",
        "message": "Job is queued."
    }
    ```
- **Response (processing):**
    ```json
    {
        "job_id": "12345",
        "status": "processing",
        "progress": 60,
        "message": "Job is currently being processed."
    }
    ```
- **Response (completed):**
    ```json
    {
        "jobId": "12345",
        "status": "completed",
        "outputFormat": "json",
        "result": {
            "transactions": [...]
        }
    }
    ```
</details>

<details>
<summary>Retrieve Parsed Output</summary>

- **Endpoint:** `GET /api/v1/statements/{jobId}/result`
- **Description:** Retrieve the parsed output in CSV or JSON format.
- **Response (JSON):**
    ```json
    {
        "job_id": "12345",
        "status": "completed",
        "output_format": "json",
        "result": {
            "transactions": [...]
        }
    }
    ```
- **Response (CSV):**
    ```csv
    Date,Description,Amount,Balance
    2024-08-14,"Transaction description",100.00,1500.00
    ```
</details>

<details>
<summary>Get list of all jobs</summary>

- **Endpoint:** `GET /api/v1/statements/jobs`
- **Description:** Get a list of all jobs.
- **Response (JSON):**
    ```json
    [
        {
            "jobId": "12345",
            "status": "queued",
            "createdAt": "2023-08-14T12:34:56.789Z",
            "updatedAt": "2023-08-14T12:34:56.789Z"
        },
        {
            "jobId": "67890",
            "status": "processing",
            "createdAt": "2023-08-14T12:34:56.789Z",
            "updatedAt": "2023-08-14T12:34:56.789Z"
        }
    ]
    ```
</details>

<details>
<summary>Delete job</summary>

- **Endpoint:** `DELETE /api/v1/statements/{jobId}`
- **Description:** Delete a job.
- **Response:**
    ```json
    {
        "jobId": "12345",
        "status": "deleted",
        "message": "Job has been deleted."
    }
    ```
</details>

## Job Lifecycle

1. **Upload PDF:** The user uploads a bank statement PDF via `POST /api/v1/statements`.
2. **Queue Job:** The server adds the job to a queue.
3. **Process Job:** Worker processes pick up jobs from the queue and start parsing the PDF.
4. **Check Status:** The user can poll the job status via `GET /api/v1/statements/{jobId}/status`.
5. **Retrieve Result:** Once the job is completed, the user can retrieve the parsed data via `GET /api/v1/statements/{jobId}/result`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
