// Integrations compatibility layer
import { backendClient } from './backendClient';

export const Core = backendClient.integrations.Core;
export const InvokeLLM = backendClient.integrations.Core.InvokeLLM;
export const SendEmail = backendClient.integrations.Core.SendEmail;
export const SendSMS = backendClient.integrations.Core.SendSMS;
export const UploadFile = backendClient.integrations.Core.UploadFile;
export const GenerateImage = backendClient.integrations.Core.GenerateImage;
export const ExtractDataFromUploadedFile = backendClient.integrations.Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = backendClient.integrations.Core.CreateFileSignedUrl;
export const UploadPrivateFile = backendClient.integrations.Core.UploadPrivateFile;
