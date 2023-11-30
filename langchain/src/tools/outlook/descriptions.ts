export const SEND_MAIL_TOOL_DESCRIPTION = "A tool for sending emails. \
input instructions: \
input a JSON formatted email message with the following four keys:\
'subject', 'content', 'to', and 'cc'.\
The 'subject' should be a brief title for the email, \
'content' should contain the body of the email, \
'to' should be an array of the recipient's email address, \
and 'cc' should be an array of any additional recipient's email address. \
The 'cc' key is optional, just give empty array if no cc. \
Ensure that the JSON object is correctly formatted and includes all four specified keys.\
";
// This is an example of a valid JSON object: \
// {\"subject\":\"Example Subject\",\"content\":\"Example Content\",\"to\":[\"team@example.com\"],\"cc\":[]}\
// ";


export const READ_MAIL_TOOL_DESCRIPTION = `A tool for reading emails.\
You can search messages based on a value in specific message properties. \
The results of the search are sorted by the date and time that the message was sent.\
A $search request returns up to 1000 results.\
If you do a search on messages and specify only a value without specific message properties, \
the search is carried out on the default search properties of from, subject, and body.\
Alternatively, you can search messages by specifying message property names in the following table\
and a value to search for in those properties.\n\
body: The body of an email message.\n\
cc: The cc field of an email message, specified as an SMTP address, display name, or alias.\n\
from: The sender of an email message, specified as an SMTP address, display name, or alias.\n\
received: The date that an email message was received by a recipient. e.g. 07/23/2018\n\
recipients: The to, cc, and bcc fields of an email meesage,\n\
sent: The date that an email message was sent by the sender. e.g. 07/23/2018\n\
subject: The text in the subject line of an email message.\n\
to: The to field of an email message,\n\
INPUT:\n\
input empty string to get all emails.\n\
If on default: $search=\"<property>\" \n\
On specified property: $search=\"<property>:<value>\"\n\
Example: $search=\"sent:07/23/2018\"
`;