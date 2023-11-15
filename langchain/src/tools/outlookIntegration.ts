import { Tool, type ToolParams } from "./base.js";
import fetch from 'node-fetch';


export interface Email {
  sender: string;
  subject: string;
  // Add other properties as needed
}

interface SendEmailParams {
  to: string;
  subject: string;
  content: string;
}

interface ReadEmailParams {
  // Define parameters for reading emails if needed
}

// ... other parameter types for different actions



/**
 * The OutlookIntegration class is a tool used to send and 
 * read emails. It extends the base Tool class.
 */
export class OutlookIntegration extends Tool {
  accessToken: string; // Store the OAuth2 access token

  static lc_name() {
    return "Outlook Integration";
  }
  name = "outlook-integration";
  description = `Useful for sending and reading emails. The input to this tool should be a valid email address.`;

  constructor(params: ToolParams, accessToken: string) {
    super(params);
    this.accessToken = accessToken; // Initialize with an OAuth2 access token
    this.
  }

  

  async readEmails(): Promise<Email[]> {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders('Inbox')/messages?$select=sender,subject", {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return data.value; // Assuming 'value' contains the array of emails
    } catch (error) {
      console.error("Failed to read emails:", error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, content: string): Promise<void> {
    const message = {
      message: {
        subject: subject,
        body: {
          contentType: "Text",
          content: content,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
    };

    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      console.log("Email sent successfully");
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // Implement the abstract _call method
  async _call(action: string, params: SendEmailParams | ReadEmailParams): Promise<void> {
    switch (action) {
      case "sendEmail":
        const { to, subject, content } = params as SendEmailParams;
        await this.sendEmail(to, subject, content);
        break;
      case "readEmails":
        await this.readEmails();
        break;
      default:
        throw new Error(`Action ${action} is not supported`);
    }
  }
  

  // You can add more methods for other features like managing contacts, calendar, etc.

}


// import fetch from "node-fetch";

// const accessToken = "YOUR_ACCESS_TOKEN";

// const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
//     headers: {
//         Authorization: `Bearer ${accessToken}`,
//     },
// });

// const data = await response.json();

// console.log(data);