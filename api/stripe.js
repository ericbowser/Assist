const Stripe = require('stripe');
const dotenv = require('dotenv').config();
const stripe = new Stripe(dotenv.parsed.STRIPE_TEST_API_KEY);

const createCustomer = async () => {
    const customer = await stripe.customers.create({
        email: 'customer@example.com',
    });
    console.log('created customer:', customer);
    return customer;
}

module.exports = createCustomer;