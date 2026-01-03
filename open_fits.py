import matplotlib.pyplot as plt
from astropy.io import fits
from astropy.visualization import make_lupton_rgb

# --- הגדרת נתיבים לקבצים ---
# עדכן את הנתיב לתיקייה שבה שמרת את שלושת הקבצים
base_path = r"C:\Users\koren\OneDrive\קורן\בן גוריון\סמסטר ז\אסטרו\power_point"
# עדכן את השם הבסיסי של הקובץ (החלק הארוך של המספרים)
file_id = "1426515506038335488"

# בניית הנתיבים המלאים לכל פילטר
g_file = f"{base_path}\\{file_id}_g.fits"
r_file = f"{base_path}\\{file_id}_r.fits"
i_file = f"{base_path}\\{file_id}_i.fits"

print("Loading FITS files...")
# --- טעינת הנתונים ---
# פותחים כל קובץ ולוקחים את המידע (data) מה-HDU הראשון (אינדקס 0)
try:
    g_data = fits.open(g_file)[0].data
    r_data = fits.open(r_file)[0].data
    i_data = fits.open(i_file)[0].data
except FileNotFoundError as e:
    print(f"\nError: One or more files not found. Make sure you downloaded g, r, and i files.\nDetails: {e}")
    exit()

print("Creating RGB composite...")
# --- יצירת התמונה הצבעונית ---
# הפונקציה הזו לוקחת את שלושת הערוצים (אדום, ירוק, כחול) ומאחדת אותם
# הפרמטרים stretch ו-Q שולטים על הבהירות והניגודיות.
# ערכים אלו (0.5 ו-10) בדרך כלל עובדים טוב לגלקסיות של SDSS.
rgb_image = make_lupton_rgb(i_data, r_data, g_data, stretch=0.5, Q=10)

# --- הצגה ---
plt.figure(figsize=(8, 8))
plt.imshow(rgb_image, origin='lower') # origin='lower' חשוב באסטרונומיה כדי שהתמונה לא תהיה הפוכה
plt.title(f"SDSS Galaxy RGB Composite\n(R=i-band, G=r-band, B=g-band)")
plt.axis('off') # הסתרת הצירים
plt.show()

# אם אתה רוצה לשמור את התמונה לקובץ (למשל למצגת)
# plt.imsave(r"C:\path\to\save\galaxy_rgb.png", rgb_image, origin='lower')