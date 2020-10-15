import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { random } from "node-forge";
import { addUrlQuery, defaultSkynetPortalUrl, randomNumber } from "./utils";
import { SkynetClient } from ".";
import { FileType, NewFileID, SkyFile, User } from "./skydb";

describe("User", () => {
  it("should have set a user id", async () => {
    const user = User.New("john.doe@example.com", "supersecret");
    expect(user.id.length).toBeGreaterThan(0);
  });

  it("should be deterministic", async () => {
    const username = random.getBytesSync(randomNumber(6, 24));
    const password = random.getBytesSync(randomNumber(12, 64));
    const expected = User.New(username, password);
    for (let i = 0; i < 100; i++) {
      expect(User.New(username, password).id).toEqual(expected.id);
    }
  });
});

const user = User.New("john.doe@example.com", "supersecret");

const appID = "SkySkapp";
const filename = "foo.txt";
const fileID = NewFileID(appID, FileType.PublicUnencrypted, filename);

const skylink = "CABAB_1Dt0FJsxqsu_J4TodNCbCGvtFf1Uys_3EgzOlTcg";

const portalUrl = defaultSkynetPortalUrl;
const registryUrl = `${portalUrl}/skynet/registry`;
const uploadUrl = `${portalUrl}/skynet/skyfile`;

const client = new SkynetClient(portalUrl);

describe("getFile", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should perform a lookup and update the window to the skylink url", async () => {
    // mock a successful registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      userid: user.id,
      fileid: Buffer.from(
        JSON.stringify({
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        })
      ),
    });
    mock.onGet(registryLookupUrl).reply(200, {
      Tweak: "",
      Data: skylink,
      Revision: 11,
      Signature: "",
    });

    await client.getFile(user, fileID);
    expect(mock.history.get.length).toBe(1);
  });
});

describe("setFile", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    mock.resetHistory();
  });

  it("should perform an upload, lookup and registry update", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a successful registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      userid: user.id,
      fileid: Buffer.from(
        JSON.stringify({
          version: fileID.version,
          applicationid: fileID.applicationID,
          filetype: fileID.fileType,
          filename: fileID.filename,
        })
      ),
    });

    mock.onGet(registryLookupUrl).reply(200, {
      Tweak: "",
      Data: skylink,
      Revision: 11,
      Signature: "",
    });

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // mock a file
    const file = new File(["thisistext"], filename, { type: "text/plain" });

    // call `setFile` on the client
    await client.setFile(user, fileID, SkyFile.New(file));

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = mock.history.post[1].data as FormData;
    expect(data).toBeDefined();
    expect(data.get("data")).toEqual(skylink);
    expect(data.get("publickey")).toEqual(user.id);
    expect(data.get("fileid")).toEqual(
      JSON.stringify({
        version: fileID.version,
        applicationid: fileID.applicationID,
        filetype: fileID.fileType,
        filename: fileID.filename,
      })
    );
    expect(data.get("revision")).toEqual("12");
    expect(data.get("signature")).toBeDefined();
    expect(data.get("signature")).toBeTruthy();
  });

  it("should use a revision number of 0 if the lookup failed", async () => {
    // mock a successful upload
    mock.onPost(uploadUrl).reply(200, { skylink });

    // mock a failed registry lookup
    const registryLookupUrl = addUrlQuery(registryUrl, {
      userid: user.id,
      fileid: Buffer.from(JSON.stringify(fileID)),
    });

    mock.onGet(registryLookupUrl).reply(400);

    // mock a successful registry update
    mock.onPost(registryUrl).reply(204);

    // mock a file
    const file = new File(["thisistext"], filename, { type: "text/plain" });

    // call `setFile` on the client
    await client.setFile(user, fileID, SkyFile.New(file));

    // assert our request history contains the expected amount of requests
    expect(mock.history.get.length).toBe(1);
    expect(mock.history.post.length).toBe(2);

    const data = mock.history.post[1].data as FormData;
    expect(data).toBeDefined();
    expect(data.get("data")).toEqual(skylink);
    expect(data.get("publickey")).toEqual(user.id);
    expect(data.get("fileid")).toEqual(
      JSON.stringify({
        version: fileID.version,
        applicationid: fileID.applicationID,
        filetype: fileID.fileType,
        filename: fileID.filename,
      })
    );
    expect(data.get("revision")).toEqual("0");
    expect(data.get("signature")).toBeDefined();
    expect(data.get("signature")).toBeTruthy();
  });
});