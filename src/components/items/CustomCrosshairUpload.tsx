import { useState, useRef } from "react";
import { Button, Form, Alert } from "react-bootstrap";
import { del, get, set } from "idb-keyval";
import { imageToVTF } from "@utils/vtf";

interface CustomCrosshair {
  name: string;
  vtfData: Uint8Array;
  vmtData: string;
  previewUrl: string;
  width: number;
  height: number;
}

const CUSTOM_CROSSHAIRS_KEY = "custom-crosshairs";

export function CustomCrosshairUpload({
  onCrosshairAdded,
}: {
  onCrosshairAdded?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please upload an image file (PNG, JPG, etc.)");
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB");
      }

      // Generate a unique name
      const timestamp = Date.now();
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const customName = `custom_${baseName}_${timestamp}`;

      // Convert to VTF
      const { vtf, width, height } = await imageToVTF(file, 64);

      // Create preview URL from original file
      const previewUrl = URL.createObjectURL(file);

      // Generate VMT content
      const crosshairTargetBase = "vgui/replay/thumbnails/";
      const vmtContent = `UnlitGeneric
{
\t$translucent 1
\t$basetexture "${crosshairTargetBase}${customName}"
\t$vertexcolor 1
\t$no_fullbright 1
\t$ignorez 1
}`;

      // Create custom crosshair object
      const customCrosshair: CustomCrosshair = {
        name: customName,
        vtfData: vtf,
        vmtData: vmtContent,
        previewUrl,
        width,
        height,
      };

      // Get existing custom crosshairs
      const existingCrosshairs: CustomCrosshair[] =
        (await get(CUSTOM_CROSSHAIRS_KEY)) || [];

      // Add new crosshair
      existingCrosshairs.push(customCrosshair);

      // Save to IndexedDB
      await set(CUSTOM_CROSSHAIRS_KEY, existingCrosshairs);

      // Update dynamic crosshair packs
      if (globalThis.dynamicCrosshairPacks) {
        globalThis.dynamicCrosshairPacks[customName] = {
          _0_0: {
            name: customName,
            preview: previewUrl,
            hasCustomMaterial: true,
          },
        };
      }

      setSuccess(`Custom crosshair "${customName}" uploaded successfully!`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent component
      if (onCrosshairAdded) {
        onCrosshairAdded();
      }
    } catch (err) {
      console.error("Error uploading crosshair:", err);
      setError(err instanceof Error ? err.message : "Failed to upload crosshair");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="custom-crosshair-upload mb-3">
      <h5>Upload Custom Crosshair</h5>
      <Form.Group>
        <Form.Label>
          Select an image file (PNG, JPG, etc.) to use as a crosshair
        </Form.Label>
        <Form.Control
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={uploading}
          className="bg-dark text-light"
        />
        <Form.Text className="text-muted">
          Images will be automatically resized to 64x64 pixels with transparency
          preserved.
        </Form.Text>
      </Form.Group>

      {uploading && (
        <Alert variant="info" className="mt-2">
          <div className="d-flex align-items-center">
            <div
              className="spinner-border spinner-border-sm me-2"
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            Processing image...
          </div>
        </Alert>
      )}

      {error && (
        <Alert
          variant="danger"
          className="mt-2"
          dismissible
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          className="mt-2"
          dismissible
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
    </div>
  );
}

/**
 * Load custom crosshairs from IndexedDB
 */
export async function loadCustomCrosshairs(): Promise<CustomCrosshair[]> {
  return (await get(CUSTOM_CROSSHAIRS_KEY)) || [];
}

/**
 * Delete a custom crosshair
 */
export async function deleteCustomCrosshair(name: string): Promise<void> {
  const crosshairs: CustomCrosshair[] =
    (await get(CUSTOM_CROSSHAIRS_KEY)) || [];
  const filtered = crosshairs.filter((c) => c.name !== name);
  await set(CUSTOM_CROSSHAIRS_KEY, filtered);

  // Remove from dynamic crosshair packs
  if (globalThis.dynamicCrosshairPacks && globalThis.dynamicCrosshairPacks[name]) {
    delete globalThis.dynamicCrosshairPacks[name];
  }
}

/**
 * Get custom crosshair data for download
 */
export async function getCustomCrosshairForDownload(
  name: string,
): Promise<{ vtf: Blob; vmt: Blob } | null> {
  const crosshairs: CustomCrosshair[] =
    (await get(CUSTOM_CROSSHAIRS_KEY)) || [];
  const crosshair = crosshairs.find((c) => c.name === name);

  if (!crosshair) {
    return null;
  }

  const vtfBlob = new Blob([crosshair.vtfData], {
    type: "application/octet-stream",
  });
  const vmtBlob = new Blob([crosshair.vmtData], { type: "text/plain" });

  return { vtf: vtfBlob, vmt: vmtBlob };
}
