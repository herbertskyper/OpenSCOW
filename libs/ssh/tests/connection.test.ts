import { NodeSSH } from "node-ssh";
import { insertKeyAsRoot } from "src/key";
import { SftpError } from "src/sftp";
import { sshConnect, SshConnectError, sshRawConnect, sshRawConnectByPassword } from "src/ssh";

jest.mock("node-ssh");
jest.mock("src/key", () => ({ insertKeyAsRoot: jest.fn() }));

const keyPair = { publicKey: "test-public-key", privateKey: "test-private-key" };
const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), trace: jest.fn() };
const connections: { connect: jest.Mock; dispose: jest.Mock }[] = [];
const failures: Error[] = [];

beforeEach(() => {
  jest.resetAllMocks();
  connections.length = 0;
  failures.length = 0;
  jest.mocked(NodeSSH).mockImplementation(() => {
    const failure = failures.shift();
    const connection = {
      connect: failure ? jest.fn().mockRejectedValue(failure) : jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn() };
    connections.push(connection);
    return connection as unknown as NodeSSH;
  });
});

it("disposes a failed handshake, retries with a new client and never rewrites keys for a timeout", async () => {
  failures.push(Object.assign(new Error("handshake timeout"), { level: "client-timeout" }));
  const connection = await sshRawConnect("login:22", "user", keyPair, logger);
  expect(connection).toBe(connections[1]);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
  expect(connections[1].dispose).not.toHaveBeenCalled();
  expect(insertKeyAsRoot).not.toHaveBeenCalled();
  expect(connections[1].connect).toHaveBeenCalledWith(expect.objectContaining({
    readyTimeout: 15000, authHandler: ["publickey"],
  }));
});

it("prepares a user key only after an authentication failure", async () => {
  failures.push(Object.assign(new Error("authentication failed"), { level: "client-authentication" }));
  await sshRawConnect("login", "user", keyPair, logger);
  expect(insertKeyAsRoot).toHaveBeenCalledTimes(1);
  expect(insertKeyAsRoot).toHaveBeenCalledWith("user", "login", keyPair, logger);
  expect(connections).toHaveLength(2);
});

it("bounds network retries and disposes both failed clients", async () => {
  failures.push(...Array.from({ length: 2 }, () => Object.assign(new Error("reset"), { code: "ECONNRESET" })));
  await expect(sshRawConnect("login", "user", keyPair, logger)).rejects.toBeInstanceOf(SshConnectError);
  expect(connections).toHaveLength(2);
  connections.forEach((connection) => expect(connection.dispose).toHaveBeenCalledTimes(1));
  expect(insertKeyAsRoot).not.toHaveBeenCalled();
});

it("does not retry a root authentication failure", async () => {
  failures.push(Object.assign(new Error("authentication failed"), { level: "client-authentication" }));
  await expect(sshRawConnect("login", "root", keyPair, logger)).rejects.toBeInstanceOf(SshConnectError);
  expect(connections).toHaveLength(1);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
  expect(insertKeyAsRoot).not.toHaveBeenCalled();
});

it("normalizes preparation failures without leaking the failed connection", async () => {
  failures.push(Object.assign(new Error("authentication failed"), { level: "client-authentication" }));
  jest.mocked(insertKeyAsRoot).mockRejectedValue(new Error("root unavailable"));
  await expect(sshRawConnect("login", "user", keyPair, logger)).rejects.toBeInstanceOf(SshConnectError);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
});

it("disposes a failed password connection", async () => {
  failures.push(new Error("authentication failed"));
  await expect(sshRawConnectByPassword("login", "user", "test-only", logger)).rejects.toBeInstanceOf(SshConnectError);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
});

it("disposes a successful connection after a command fails", async () => {
  await expect(sshConnect("login", "user", keyPair, logger, async () => {
    throw new Error("command failed");
  })).rejects.toBeInstanceOf(SshConnectError);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
});

it("preserves a file permission error instead of reporting a connection failure", async () => {
  const error = new SftpError(Object.assign(new Error("Permission denied"), { code: 3 }));
  await expect(sshConnect("login", "user", keyPair, logger, async () => {
    throw error;
  })).rejects.toBe(error);
  expect(connections[0].dispose).toHaveBeenCalledTimes(1);
});
