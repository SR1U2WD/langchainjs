import { OutlookReadMailTool, OutlookSendMailTool } from "../outlook/index.js";
import { AuthFlowToken } from "../outlook/authFlowToken.js";

describe("OutlookReadMailTool Test", () => {
  const authFlowToken = new AuthFlowToken();

  test("Test read messages", async () => {
    const outlookTool = new OutlookReadMailTool(authFlowToken, "refresh");
    const emails = await outlookTool._call("");
    console.log(emails);
    expect(true).toBe(true);
  });

  test("Test invalid query format", async () => {
    const outlookTool = new OutlookReadMailTool(authFlowToken, "refresh");
    const emails = await outlookTool._call("blah");
    console.log(emails);
    expect(emails).toBe("Invalid query format");
  });

  test("Test query correct format", async () => {
    const outlookTool = new OutlookReadMailTool(authFlowToken, "refresh");
    const emails = await outlookTool._call('$search="subject:hello"');
    console.log(emails);
    expect(true).toBe(true);
  });
});

describe("OutlookSendMailTool Test", () => {
  const authFlowToken = new AuthFlowToken();
  test("Test invalid TO email address", async () => {
    const message = JSON.stringify({
      subject: "test",
      content: "test",
      to: ["testemail"],
      cc: [],
    });
    const outlookTool = new OutlookSendMailTool(authFlowToken, "refresh");
    const res = await outlookTool._call(message);
    console.log(res);
    expect(res).toBe("TO must be an array of valid email in strings");
  });

  test("Test invalid CC email address", async () => {
    const message = JSON.stringify({
      subject: "test",
      content: "test",
      to: ["test@email.com"],
      cc: ["blah"],
    });
    const outlookTool = new OutlookSendMailTool(authFlowToken, "refresh");
    const res = await outlookTool._call(message);
    console.log(res);
    expect(res).toBe("CC must be an array of valid email in strings");
  });

  test("Test invalid JSON format", async () => {
    const message = "blah";
    const outlookTool = new OutlookSendMailTool(authFlowToken, "refresh");
    const res = await outlookTool._call(message);
    console.log(res);
    expect(res).toBe("Invalid JSON format");
  });
});
