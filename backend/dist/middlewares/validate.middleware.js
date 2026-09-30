import { ZodError } from 'zod';
import { ERROR_CODES } from '../config/constants.js';
export function validate(schemas) {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = await schemas.query.parseAsync(req.query);
            }
            if (schemas.params) {
                req.params = await schemas.params.parseAsync(req.params);
            }
            next();
        }
        catch (err) {
            if (err instanceof ZodError) {
                const details = {};
                for (const issue of err.issues) {
                    const field = issue.path.join('.') || 'root';
                    details[field] = issue.message;
                }
                res.status(422).json({
                    error: {
                        code: ERROR_CODES.VALIDATION_ERROR,
                        message: 'Request validation failed',
                        details
                    }
                });
                return;
            }
            next(err);
        }
    };
}
