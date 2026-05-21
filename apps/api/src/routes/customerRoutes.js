import express from 'express';
import { 
  getCustomers, upsertCustomer, deleteCustomer, 
  addSpecialPrice, removeSpecialPrice,
  getCustomerCategories, createCustomerCategory, deleteCustomerCategory
} from '../controllers/customerController.js';

const router = express.Router();

router.get('/categories', getCustomerCategories);
router.post('/categories', createCustomerCategory);
router.delete('/categories/:id', deleteCustomerCategory);

router.get('/', getCustomers);
router.post('/upsert', upsertCustomer);
router.delete('/:id', deleteCustomer);

router.post('/special-price', addSpecialPrice);
router.delete('/special-price/:id', removeSpecialPrice);

export default router;