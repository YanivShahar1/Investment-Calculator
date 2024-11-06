export class ValidationService {
    static validateYearInputs(startYear, endYear) {
        const currentYear = new Date().getFullYear();
        
        if (startYear > endYear) {
            return { isValid: false, error: 'Start year must be before end year' };
        }
        
        if (startYear < 1970) {
            return { isValid: false, error: 'Start year must be 1970 or later' };
        }
        
        if (endYear > currentYear + 1) {
            return { isValid: false, error: `End year cannot be more than ${currentYear + 1}` };
        }
        
        return { isValid: true };
    }

    static validateFormInputs(formData) {
        const errors = [];
        
        if (formData.initialInvestment < 0) {
            errors.push('Initial investment cannot be negative');
        }
        
        if (formData.additionAmount < 0) {
            errors.push('Additional investment amount cannot be negative');
        }
        
        if (formData.stocks.length === 0) {
            errors.push('At least one stock must be selected');
        }
        
        const yearValidation = this.validateYearInputs(formData.startYear, formData.endYear);
        if (!yearValidation.isValid) {
            errors.push(yearValidation.error);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
