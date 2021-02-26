import { downloadFileHnsToPath, downloadFileToPath } from "../download/node";
import {
  uploadDirectoryFromPath,
  uploadDirectoryFromPathRequest,
  uploadFileFromPath,
  uploadFileFromPathRequest,
  uploadFileContent,
  uploadFileContentRequest,
} from "../upload/node";
import { SkynetClient as Client } from "./index";

export class SkynetClient extends Client {
  // Download
  downloadFileToPath = downloadFileToPath;
  downloadFileHnsToPath = downloadFileHnsToPath;

  // Upload
  uploadDirectoryFromPath = uploadDirectoryFromPath;
  protected uploadDirectoryFromPathRequest = uploadDirectoryFromPathRequest;
  uploadFileFromPath = uploadFileFromPath;
  protected uploadFileFromPathRequest = uploadFileFromPathRequest;
  uploadFileContent = uploadFileContent;
  protected uploadFileContentRequest = uploadFileContentRequest;
}
