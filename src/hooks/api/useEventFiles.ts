import { useMutation, useQuery } from "react-query";
import type { APIResponse } from "../../interfaces/BaseApiResponse";
import ax from "../../service/axios";

export interface EventFile {
  id: number;
  event_id: number;
  file_name: string;
  file_size: number;
  file_size_readable: string;
  file_url: string;
  mime_type: string;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
}

export async function prepareEventFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /image\/(gif|svg)/i.test(file.type)) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error(`"${file.name}" exceeds the 2 MB per-file limit.`);
    }
    return file;
  }

  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error(`"${file.name}" could not be resized.`);
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error(`"${file.name}" could not be resized.`);
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error(`"${file.name}" exceeds the 2 MB limit after resizing.`);
  }
  const baseName = file.name.replace(/\.[^.]*$/, "") || file.name;
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

export async function getEventFiles(eventId: number) {
  const response = await ax.get<APIResponse<EventFile[]>>("/v1/event-files", {
    params: { event_id: eventId },
  });
  if (response.data.success === false) {
    throw new Error(response.data.message || "Failed to load event files.");
  }
  return response.data;
}

export async function uploadEventFile({ eventId, file }: { eventId: number; file: File }) {
  const formData = new FormData();
  formData.append("event_id", String(eventId));
  formData.append("file", file);

  const response = await ax.post<APIResponse<EventFile>>("/v1/event-files", formData);
  if (response.data.success === false) {
    throw new Error(response.data.message || "Failed to upload event file.");
  }
  return response.data;
}

export async function deleteEventFile(id: number) {
  const response = await ax.delete<APIResponse<unknown>>(`/v1/event-files/${id}`);
  if (response.data.success === false) {
    throw new Error(response.data.message || "Failed to delete event file.");
  }
  return response.data;
}

export function useGetEventFiles(eventId: number, enabled = true) {
  return useQuery(
    ["useGetEventFiles", eventId],
    () => getEventFiles(eventId),
    { enabled: enabled && eventId > 0 },
  );
}

export function useUploadEventFile() {
  return useMutation(uploadEventFile);
}

export function useDeleteEventFile() {
  return useMutation(deleteEventFile);
}
