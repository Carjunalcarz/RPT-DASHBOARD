
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "info": {
      "title": "RPT Dashboard API",
      "version": "1.0.0",
      "description": "API for RPT Dashboard with MSSQL and Supabase support"
    },
    "servers": [
      {
        "url": "http://localhost:3000"
      }
    ],
    "components": {
      "securitySchemes": {
        "cookieAuth": {
          "type": "apiKey",
          "in": "cookie",
          "name": "access_token"
        }
      },
      "schemas": {
        "AuditLog": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "tableName": {
              "type": "string"
            },
            "recordId": {
              "type": "string"
            },
            "action": {
              "type": "string"
            },
            "userId": {
              "type": "string"
            },
            "ipAddress": {
              "type": "string"
            },
            "timestamp": {
              "type": "string",
              "format": "date-time"
            },
            "details": {
              "type": "object"
            },
            "oldValues": {
              "type": "object"
            },
            "newValues": {
              "type": "object"
            }
          }
        },
        "Item": {
          "type": "object",
          "required": [
            "name",
            "source"
          ],
          "properties": {
            "id": {
              "type": "string",
              "description": "The auto-generated id of the item"
            },
            "name": {
              "type": "string",
              "description": "The name of the item"
            },
            "source": {
              "type": "string",
              "enum": [
                "supabase",
                "mssql"
              ],
              "default": "supabase",
              "example": "supabase",
              "description": "Which database to use"
            }
          }
        },
        "TestTask": {
          "type": "object",
          "required": [
            "title"
          ],
          "properties": {
            "id": {
              "type": "integer"
            },
            "title": {
              "type": "string"
            },
            "description": {
              "type": "string"
            },
            "status": {
              "type": "string",
              "enum": [
                "pending",
                "in-progress",
                "completed"
              ]
            },
            "priority": {
              "type": "string",
              "enum": [
                "low",
                "medium",
                "high"
              ]
            },
            "dueDate": {
              "type": "string",
              "format": "date-time"
            },
            "createdAt": {
              "type": "string",
              "format": "date-time"
            },
            "updatedAt": {
              "type": "string",
              "format": "date-time"
            }
          }
        }
      }
    },
    "security": [
      {
        "cookieAuth": []
      }
    ],
    "paths": {
      "/api/v1/audit": {
        "get": {
          "summary": "Get audit logs",
          "tags": [
            "Audit"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "source",
              "schema": {
                "type": "string",
                "enum": [
                  "mssql",
                  "supabase"
                ]
              },
              "description": "Database source (default: supabase)"
            },
            {
              "in": "query",
              "name": "tableName",
              "schema": {
                "type": "string"
              },
              "description": "Filter by table name"
            },
            {
              "in": "query",
              "name": "action",
              "schema": {
                "type": "string"
              },
              "description": "Filter by action (CREATE, UPDATE, DELETE)"
            },
            {
              "in": "query",
              "name": "userId",
              "schema": {
                "type": "string"
              },
              "description": "Filter by user ID"
            },
            {
              "in": "query",
              "name": "startDate",
              "schema": {
                "type": "string",
                "format": "date-time"
              },
              "description": "Start date (ISO 8601)"
            },
            {
              "in": "query",
              "name": "endDate",
              "schema": {
                "type": "string",
                "format": "date-time"
              },
              "description": "End date (ISO 8601)"
            },
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "default": 1
              },
              "description": "Page number"
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 10
              },
              "description": "Number of items per page"
            }
          ],
          "responses": {
            "200": {
              "description": "List of audit logs",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string"
                      },
                      "source": {
                        "type": "string"
                      },
                      "results": {
                        "type": "integer"
                      },
                      "total": {
                        "type": "integer"
                      },
                      "page": {
                        "type": "integer"
                      },
                      "totalPages": {
                        "type": "integer"
                      },
                      "data": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/AuditLog"
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid parameters"
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/auth/login": {
        "post": {
          "summary": "Login with email and password",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "password"
                  ],
                  "properties": {
                    "email": {
                      "type": "string",
                      "format": "email",
                      "description": "User email address",
                      "example": "user@example.com"
                    },
                    "password": {
                      "type": "string",
                      "format": "password",
                      "description": "User password",
                      "example": "password123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "success"
                      },
                      "data": {
                        "type": "object",
                        "properties": {
                          "access_token": {
                            "type": "string",
                            "description": "JWT access token"
                          },
                          "refresh_token": {
                            "type": "string",
                            "description": "Refresh token"
                          },
                          "expires_in": {
                            "type": "integer",
                            "description": "Token expiration time in seconds"
                          },
                          "user": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string",
                                "format": "uuid"
                              },
                              "email": {
                                "type": "string"
                              },
                              "role": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid input or missing fields",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "fail"
                      },
                      "message": {
                        "type": "string",
                        "example": "Validation Error"
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Invalid credentials",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "fail"
                      },
                      "message": {
                        "type": "string",
                        "example": "Invalid login credentials"
                      }
                    }
                  }
                }
              }
            },
            "429": {
              "description": "Too many requests"
            },
            "503": {
              "description": "Service unavailable (Supabase not configured)"
            }
          }
        }
      },
      "/api/v1/batch/update-task-item": {
        "put": {
          "summary": "Simultaneously update a Task and an Item",
          "tags": [
            "Batch"
          ],
          "security": [
            {
              "cookieAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "taskId",
                    "itemId"
                  ],
                  "properties": {
                    "source": {
                      "type": "string",
                      "enum": [
                        "mssql",
                        "supabase"
                      ],
                      "default": "supabase"
                    },
                    "taskId": {
                      "type": "integer"
                    },
                    "taskData": {
                      "type": "object",
                      "properties": {
                        "title": {
                          "type": "string"
                        },
                        "status": {
                          "type": "string"
                        }
                      }
                    },
                    "itemId": {
                      "type": "integer"
                    },
                    "itemData": {
                      "type": "object",
                      "properties": {
                        "name": {
                          "type": "string"
                        },
                        "description": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Both entities updated successfully"
            },
            "400": {
              "description": "Bad request"
            },
            "404": {
              "description": "Task or Item not found"
            },
            "500": {
              "description": "Transaction failed"
            }
          }
        }
      },
      "/health/mssql": {
        "get": {
          "summary": "Check MSSQL database health",
          "tags": [
            "Health"
          ],
          "responses": {
            "200": {
              "description": "MSSQL is healthy"
            },
            "500": {
              "description": "MSSQL is unhealthy"
            }
          }
        }
      },
      "/health/supabase": {
        "get": {
          "summary": "Check Supabase database health",
          "tags": [
            "Health"
          ],
          "responses": {
            "200": {
              "description": "Supabase is healthy"
            },
            "500": {
              "description": "Supabase is unhealthy"
            }
          }
        }
      },
      "/api/v1/items": {
        "get": {
          "summary": "Returns the list of all items from both DBs (or filtered)",
          "tags": [
            "Items"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "source",
              "schema": {
                "type": "string",
                "enum": [
                  "mssql",
                  "supabase"
                ]
              },
              "description": "Filter by source"
            }
          ],
          "responses": {
            "200": {
              "description": "The list of the items"
            }
          }
        },
        "post": {
          "summary": "Create a new item",
          "tags": [
            "Items"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/Item"
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "The created item"
            }
          }
        }
      },
      "/api/v1/test-tasks": {
        "post": {
          "summary": "Create a new test task",
          "tags": [
            "Test Tasks"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "title"
                  ],
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "status": {
                      "type": "string",
                      "enum": [
                        "pending",
                        "in-progress",
                        "completed"
                      ]
                    },
                    "priority": {
                      "type": "string",
                      "enum": [
                        "low",
                        "medium",
                        "high"
                      ]
                    },
                    "dueDate": {
                      "type": "string",
                      "format": "date-time"
                    }
                  }
                }
              },
              "source": {
                "type": "string",
                "enum": [
                  "supabase",
                  "mssql"
                ],
                "default": "supabase",
                "example": "supabase"
              }
            }
          },
          "responses": {
            "201": {
              "description": "Task created",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/TestTask"
                  }
                }
              }
            }
          }
        },
        "get": {
          "summary": "Retrieve all test tasks",
          "tags": [
            "Test Tasks"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer",
                "default": 1
              }
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer",
                "default": 10
              }
            },
            {
              "in": "query",
              "name": "status",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "priority",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "source",
              "schema": {
                "type": "string",
                "enum": [
                  "mssql",
                  "supabase"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "List of tasks"
            }
          }
        }
      },
      "/api/v1/test-tasks/{id}": {
        "get": {
          "summary": "Retrieve a specific test task",
          "tags": [
            "Test Tasks"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "source",
              "schema": {
                "type": "string",
                "enum": [
                  "mssql",
                  "supabase"
                ]
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Task details"
            },
            "404": {
              "description": "Task not found"
            }
          }
        },
        "put": {
          "summary": "Update a test task",
          "tags": [
            "Test Tasks"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TestTask"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Task updated"
            }
          }
        },
        "delete": {
          "summary": "Delete a test task (soft delete)",
          "tags": [
            "Test Tasks"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "source",
              "schema": {
                "type": "string",
                "enum": [
                  "mssql",
                  "supabase"
                ]
              }
            }
          ],
          "responses": {
            "204": {
              "description": "Task deleted"
            }
          }
        }
      },
      "/api/v1/users": {
        "get": {
          "summary": "Get all users",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "cookieAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "List of users",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "success"
                      },
                      "results": {
                        "type": "integer",
                        "example": 1
                      },
                      "data": {
                        "type": "object",
                        "properties": {
                          "users": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string"
                                },
                                "email": {
                                  "type": "string"
                                },
                                "name": {
                                  "type": "string"
                                },
                                "role": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      },
      "/api/v1/users/me": {
        "get": {
          "summary": "Get current user profile",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "cookieAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Current user profile",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "string",
                        "example": "success"
                      },
                      "data": {
                        "type": "object",
                        "properties": {
                          "user": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string"
                              },
                              "email": {
                                "type": "string"
                              },
                              "role": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "401": {
              "description": "Unauthorized"
            }
          }
        }
      }
    },
    "tags": [
      {
        "name": "Auth",
        "description": "Authentication endpoints"
      },
      {
        "name": "Users",
        "description": "User management"
      }
    ]
  },
  "customOptions": {
    "filter": true,
    "displayRequestDuration": true,
    "docExpansion": "none"
  }
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
