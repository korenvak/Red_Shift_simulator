import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.integrate import quad
import os


INPUT_FOLDER = r'C:\Users\koren\Astro'
OUTPUT_FOLDER = r"C:\Users\koren\Astro"

if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)

LYMAN_ALPHA = 1216.0  # Angstrom
c_km_s = 299792.458   # speed of light in km/s
H0 = 70.0             # Hubble constant km/s/Mpc
MPC_TO_CM = 3.08567758e24 # conversion factor
L_SN = 1e43           # Luminosity of SN Ia in erg/s


FILE_SPECTRUM = os.path.join(INPUT_FOLDER, 'galaxy_spectrum.txt')
FILE_SN_DATA = os.path.join(INPUT_FOLDER, 'sn_data.csv')


print(f"Looking for files in: {INPUT_FOLDER}")
if not os.path.exists(FILE_SPECTRUM):
    print(f"CRITICAL ERROR: The file was not found at: {FILE_SPECTRUM}")
if not os.path.exists(FILE_SN_DATA):
    print(f"CRITICAL ERROR: The file was not found at: {FILE_SN_DATA}")


print("\n--- Processing Question 1 ---")

if os.path.exists(FILE_SPECTRUM):
    try:
        data = np.loadtxt(FILE_SPECTRUM)
        wave_rest = data[:, 0]
        flux_rest = data[:, 1]
        
        
        redshifts = [0, 0.5, 1.0, 2.0]
        plt.figure(figsize=(10, 6))
        for z in redshifts:
            wave_obs = wave_rest * (1 + z)
            plt.plot(wave_obs, flux_rest, label=f'z={z}')
        
        plt.title('Q1a: Galaxy Spectrum Expansion with Redshift')
        plt.xlabel('Observed Wavelength [Angstrom]')
        plt.ylabel('Flux')
        plt.legend()
        plt.grid(alpha=0.3)
        plt.savefig(os.path.join(OUTPUT_FOLDER, 'Q1a_Spectrum_Redshift.png'))
        plt.close()

        
        z_quasar = 3.0
        wave_obs_q = wave_rest * (1 + z_quasar)
        flux_obs_q = flux_rest.copy()
        
        clouds_z = [2.8, 2.5, 2.2, 2.0, 1.5, 1.2, 1.0]
        sigma = 30.0
        
        for z_c in clouds_z:
            center = LYMAN_ALPHA * (1 + z_c)
            
            profile = np.exp(-np.power(wave_obs_q - center, 2.) / (2 * np.power(sigma, 2.)))
            flux_obs_q *= (1 - profile)
            
        plt.figure(figsize=(10, 6))
        plt.plot(wave_obs_q, flux_obs_q, color='purple')
        plt.title(f'Q1b: Quasar Spectrum (z={z_quasar}) with Lyman Alpha Forest')
        plt.xlabel('Observed Wavelength [Angstrom]')
        plt.ylabel('Flux')
        plt.grid(alpha=0.3)
        plt.savefig(os.path.join(OUTPUT_FOLDER, 'Q1b_Lyman_Alpha_Forest.png'))
        plt.close()

       
        z_high = 8.0
        wave_obs_h = wave_rest * (1 + z_high)
        flux_obs_h = flux_rest.copy()
        
        cutoff = LYMAN_ALPHA * (1 + z_high)
        flux_obs_h[wave_obs_h < cutoff] = 0 
        
        plt.figure(figsize=(10, 6))
        plt.plot(wave_obs_h, flux_obs_h, color='darkred')
        plt.axvline(cutoff, color='k', linestyle='--', label='Ly-alpha Cutoff')
        plt.title(f'Q1c: High-z Galaxy (z={z_high}) - Gunn-Peterson Trough')
        plt.xlabel('Observed Wavelength [Angstrom]')
        plt.ylabel('Flux')
        plt.legend()
        plt.grid(alpha=0.3)
        plt.savefig(os.path.join(OUTPUT_FOLDER, 'Q1c_Reionization.png'))
        plt.close()
        
        print("Graphs for Q1 saved successfully.")

    except Exception as e:
        print(f"Error processing Q1: {e}")
else:
    print(f"Skipping Q1 because {FILE_SPECTRUM} is missing.")


print("\n--- Processing Question 2 ---")

if os.path.exists(FILE_SN_DATA):
    try:
        # טעינת נתוני הסופרנובות
        df = pd.read_csv(FILE_SN_DATA)
        
      
        flux_col = 'flux (erg/s/cm2)'
        err_col = 'err_flux(erg/s/cm2)'
        
        df['DL_Mpc'] = np.sqrt(L_SN / (4 * np.pi * df[flux_col])) / MPC_TO_CM
        
        # חישוב שגיאה (Error Propagation)
        df['DL_err'] = 0.5 * df['DL_Mpc'] * (df[err_col] / df[flux_col])
        
        
        def get_dl_theory(z, omega_m):
            omega_lambda = 1.0 - omega_m
            def integrand(zp):
                return 1.0 / np.sqrt(omega_m * (1 + zp)**3 + omega_lambda)
            
            integral, _ = quad(integrand, 0, z)
            return (c_km_s / H0) * (1 + z) * integral
        
        
        omega_range = np.arange(0.0, 1.01, 0.01)
        chi2_values = []
        
        for om in omega_range:
            chi2 = 0
            for _, row in df.iterrows():
                dl_model = get_dl_theory(row['z'], om)
                chi2 += ((row['DL_Mpc'] - dl_model) / row['DL_err'])**2
            chi2_values.append(chi2)
            
        best_omega_m = omega_range[np.argmin(chi2_values)]
        print(f"Result: Best fit Omega_m = {best_omega_m:.2f}")
        
        
        plt.figure(figsize=(10, 6))
        
        
        plt.errorbar(df['z'], df['DL_Mpc'], yerr=df['DL_err'], fmt='o', color='black', label='SN Ia Measurements')
        
      
        z_plot = np.linspace(0, 2.2, 100)
        dl_plot = [get_dl_theory(z, best_omega_m) for z in z_plot]
        
        
        plt.plot(z_plot, dl_plot, color='red', linewidth=2, label=rf'Best Fit Model ($\Omega_m={best_omega_m:.2f}$)')
        
        plt.xlabel('Redshift (z)')
        plt.ylabel('Luminosity Distance (Mpc)')
        plt.title('Q2: Hubble Diagram Fitting')
        plt.legend()
        plt.grid(alpha=0.3)
        plt.savefig(os.path.join(OUTPUT_FOLDER, 'Q2_Cosmology_Fit.png'))
        plt.close()
        
        print("Graph for Q2 saved successfully.")

    except Exception as e:
        print(f"Error processing Q2: {e}")
else:
    print(f"Skipping Q2 because {FILE_SN_DATA} is missing.")

print("\n--- Done ---")