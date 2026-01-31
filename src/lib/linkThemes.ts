import { LinkPageTheme } from "@/hooks/useLinkPages";

export const PRESET_THEMES: { id: string; name: string; thumbnailGradient?: string; theme: LinkPageTheme }[] = [
    {
        id: 'classic-white',
        name: 'Classic White',
        thumbnailGradient: 'linear-gradient(to right, #ffffff, #f0f0f0)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#ffffff',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'shadow',
            buttonColor: '#000000',
            buttonTextColor: '#ffffff',
            textColor: '#000000',
            font: 'Inter'
        }
    },
    {
        id: 'classic-dark',
        name: 'Dark Mode',
        thumbnailGradient: 'linear-gradient(to right, #000000, #1a1a1a)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#09090b',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#000000',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'sunset',
        name: 'Sunset Vibes',
        thumbnailGradient: 'linear-gradient(to bottom, #FF8008, #FFC837)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to bottom, #FF8008, #FFC837)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: 'rgba(255,255,255,0.9)',
            buttonTextColor: '#d94e00',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'ocean',
        name: 'Deep Ocean',
        thumbnailGradient: 'linear-gradient(to top, #09203f, #537895)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #09203f 0%, #537895 100%)',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#ffffff',
            buttonTextColor: '#ffffff',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'forest',
        name: 'Forest Mist',
        thumbnailGradient: 'linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#2d6a4f',
            buttonTextColor: '#ffffff',
            textColor: '#1b4332',
            font: 'Inter'
        }
    },
    {
        id: 'minimal-beige',
        name: 'Minimal Beige',
        thumbnailGradient: 'linear-gradient(to right, #f3e7e9, #e3eeff)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#fdfbf7',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#5c5c5c',
            buttonTextColor: '#5c5c5c',
            textColor: '#4a4a4a',
            font: 'Inter'
        }
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        thumbnailGradient: 'linear-gradient(to bottom, #3204fd, #9907facc)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#000000',
            backgroundGradient: 'linear-gradient(to bottom, #11001c, #220038)',
            backgroundImage: '',
            buttonStyle: 'square',
            buttonColor: '#00ff9f',
            buttonTextColor: '#000000',
            textColor: '#00ff9f',
            font: 'Courier New'
        }
    },
    {
        id: 'lavender',
        name: 'Soft Lavender',
        thumbnailGradient: 'linear-gradient(to top, #c471f5 0%, #fa71cd 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)',
            backgroundImage: '',
            buttonStyle: 'shadow',
            buttonColor: '#ffffff',
            buttonTextColor: '#667eea',
            textColor: '#5a67d8',
            font: 'Inter'
        }
    },
    {
        id: 'luxury',
        name: 'Luxury Gold',
        thumbnailGradient: 'linear-gradient(to right, #000000, #434343)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#0e0e0e',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#d4af37',
            buttonTextColor: '#d4af37',
            textColor: '#d4af37',
            font: 'Times New Roman'
        }
    },
    {
        id: 'berry',
        name: 'Berry Smoothie',
        thumbnailGradient: 'linear-gradient(to top, #cc208e 0%, #6713d2 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #cc208e 0%, #6713d2 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#6713d2',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'rainbow',
        name: 'Rainbow Fun',
        thumbnailGradient: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#a18cd1',
            textColor: '#5e4b85',
            font: 'Comic Sans MS'
        }
    },
    {
        id: 'terminal',
        name: 'Hacker Terminal',
        thumbnailGradient: 'radial-gradient(circle, #000000 0%, #1a1a1a 100%)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#000000',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'square',
            buttonColor: '#000000',
            buttonTextColor: '#00ff00',
            textColor: '#00ff00',
            font: 'Courier New'
        }
    },
    {
        id: 'cherry',
        name: 'Cherry Bomb',
        thumbnailGradient: 'linear-gradient(to bottom, #eb3349, #f45c43)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to bottom, #eb3349, #f45c43)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#eb3349',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'mint',
        name: 'Fresh Mint',
        thumbnailGradient: 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #0ba360 0%, #3cba92 100%)',
            backgroundImage: '',
            buttonStyle: 'shadow',
            buttonColor: '#ffffff',
            buttonTextColor: '#0ba360',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'coffee',
        name: 'Morning Coffee',
        thumbnailGradient: 'linear-gradient(to right, #636fa4, #e8cbc0)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#4b3832', // dark brown
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#be9b7b', // light brown
            buttonTextColor: '#4b3832',
            textColor: '#fff4e6',
            font: 'Georgia'
        }
    },
    {
        id: 'galaxy',
        name: 'Nebula',
        thumbnailGradient: 'linear-gradient(to bottom right, #240b36, #c31432)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to bottom right, #240b36, #c31432)',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#ffffff',
            buttonTextColor: '#ffffff',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'snow',
        name: 'Snowfall',
        thumbnailGradient: 'linear-gradient(to bottom, #e6e9f0 0%, #eef1f5 100%)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#f5f7fa',
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'shadow',
            buttonColor: '#ffffff',
            buttonTextColor: '#546e7a',
            textColor: '#37474f',
            font: 'Verdana'
        }
    },
    {
        id: 'candy',
        name: 'Cotton Candy',
        thumbnailGradient: 'linear-gradient(to top, #d299c2 0%, #fef9d7 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #d299c2 0%, #fef9d7 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#d299c2',
            textColor: '#6d4c41',
            font: 'Comic Sans MS'
        }
    },
    {
        id: 'slate',
        name: 'Clean Slate',
        thumbnailGradient: 'linear-gradient(to top, #1e3c72 0%, #2a5298 100%)',
        theme: {
            backgroundType: 'color',
            backgroundColor: '#334155', // slate-700
            backgroundGradient: '',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#1e293b', // slate-800
            buttonTextColor: '#fae8ff',
            textColor: '#f1f5f9',
            font: 'Inter'
        }
    },
    {
        id: 'warm-flame',
        name: 'Warm Flame',
        thumbnailGradient: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#e65100',
            textColor: '#ffffff',
            font: 'Inter'
        }
    },
    {
        id: 'purple-rain',
        name: 'Purple Rain',
        thumbnailGradient: 'linear-gradient(to right, #667eea, #764ba2)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to right, #667eea, #764ba2)',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#ffffff',
            buttonTextColor: '#ffffff',
            textColor: '#e9d8fd',
            font: 'Inter'
        }
    },
    {
        id: 'beach',
        name: 'Beach Day',
        thumbnailGradient: 'linear-gradient(to top, #a1c4fd 0%, #c2e9fb 100%)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to top, #a1c4fd 0%, #c2e9fb 100%)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#fff',
            buttonTextColor: '#0077b6',
            textColor: '#023e8a',
            font: 'Arial'
        }
    },
    {
        id: 'midnight-city',
        name: 'Midnight City',
        thumbnailGradient: 'linear-gradient(to top, #232526, #414345)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#000000',
            backgroundGradient: 'linear-gradient(to top, #232526, #414345)',
            backgroundImage: '',
            buttonStyle: 'outline',
            buttonColor: '#00d2ff',
            buttonTextColor: '#00d2ff',
            textColor: '#e0e0e0',
            font: 'Inter'
        }
    },
    {
        id: 'lush',
        name: 'Lush Life',
        thumbnailGradient: 'linear-gradient(to right, #56ab2f, #a8e063)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to right, #56ab2f, #a8e063)',
            backgroundImage: '',
            buttonStyle: 'shadow',
            buttonColor: '#ffffff',
            buttonTextColor: '#2e7d32',
            textColor: '#1b5e20',
            font: 'Verdana'
        }
    },
    {
        id: 'lemonade',
        name: 'Pink Lemonade',
        thumbnailGradient: 'linear-gradient(to right, #f77062, #fe5196)',
        theme: {
            backgroundType: 'gradient',
            backgroundColor: '#ffffff',
            backgroundGradient: 'linear-gradient(to right, #f77062, #fe5196)',
            backgroundImage: '',
            buttonStyle: 'rounded',
            buttonColor: '#ffffff',
            buttonTextColor: '#e91e63',
            textColor: '#ffffff',
            font: 'Inter'
        }
    }
];
