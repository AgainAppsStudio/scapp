import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Globe, User as UserIcon, Store, BellRing } from 'lucide-react';
import { useAppContext } from '../App';
import { Card, Badge, Input } from './ui';
import { db } from '../services/db';

const Settings: React.FC = () => {
  const { user, theme, setTheme, language, setLanguage, t } = useAppContext();
  const [shopSettings, setShopSettings] = useState({ shopName: '', address: '', phone: '', autoSms: false });
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    db.settings.get().then(data => setShopSettings(data));
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...shopSettings, [key]: value };
    setShopSettings(newSettings);
    
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      await db.settings.save(newSettings);
      setIsSaving(false);
    }, 1000); // Debounce 1 second
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <UserIcon size={20} /> Profile Settings
        </h3>
        <div className="flex items-center gap-6">
          <img src={user?.photoURL} alt="Profile" className="w-20 h-20 rounded-full border-4 border-gray-100 dark:border-gray-700" />
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{user?.displayName}</p>
            <p className="text-gray-500">{user?.email}</p>
            <Badge variant="info" className="mt-2">Administrator</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Store size={20} /> Shop Details
          </h3>
          {isSaving ? <span className="text-sm text-gray-400 animate-pulse">Saving...</span> : <span className="text-sm text-green-500">Saved</span>}
        </div>
        <div className="space-y-4">
          <Input label="Shop Name" value={shopSettings.shopName} onChange={e => handleSettingChange('shopName', e.target.value)} />
          <Input label="Address" value={shopSettings.address} onChange={e => handleSettingChange('address', e.target.value)} />
          <Input label="Contact Phone" value={shopSettings.phone} onChange={e => handleSettingChange('phone', e.target.value)} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <BellRing size={20} /> Notifications (Mock)
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Automated SMS Reminders</p>
            <p className="text-sm text-gray-500">Send SMS 3 days before due date.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={shopSettings.autoSms} onChange={e => handleSettingChange('autoSms', e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Globe size={20} /> Preferences
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('theme')}</p>
              <p className="text-sm text-gray-500">Choose your preferred visual style.</p>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${theme === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Sun size={16} /> {t('light')}
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Moon size={16} /> {t('dark')}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('language')}</p>
              <p className="text-sm text-gray-500">Select application language.</p>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${language === 'en' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t('english')}
              </button>
              <button 
                onClick={() => setLanguage('bn')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${language === 'bn' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t('bengali')}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
