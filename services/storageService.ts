
import { CharacterProfile } from "../types";

const DB_NAME = "VStylerDB";
const STORE_NAME = "ModelVault";
const DB_VERSION = 1;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("Không thể mở cơ sở dữ liệu trình duyệt.");
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const saveProfileToDB = async (profile: CharacterProfile): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    
    // Tạo bản sao sạch để lưu, loại bỏ các URL tạm thời (blob)
    const cleanProfile = {
      ...profile,
      references: profile.references.map(ref => ({
        base64: ref.base64,
        mimeType: ref.mimeType
      }))
    };
    
    const request = store.put(cleanProfile);
    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error("Store put error:", request.error);
      reject("Lỗi khi ghi dữ liệu vào DB.");
    };
    
    transaction.oncomplete = () => db.close();
  });
};

export const getAllProfilesFromDB = async (): Promise<CharacterProfile[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Không thể lấy danh sách mẫu.");
    
    transaction.oncomplete = () => db.close();
  });
};

export const deleteProfileFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Lỗi khi xóa mẫu.");
    
    transaction.oncomplete = () => db.close();
  });
};
