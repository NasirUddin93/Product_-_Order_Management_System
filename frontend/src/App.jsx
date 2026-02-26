import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed')
  }

  return data
}

function App() {
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/products')
      setProducts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/orders')
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders()
    }
  }, [activeTab])

  const enrichedItems = useMemo(() => {
    return orderItems.map((item) => {
      const product = products.find((entry) => String(entry.id) === String(item.product_id))
      const unitPrice = product ? Number(product.price) : 0
      const subtotal = unitPrice * Number(item.quantity || 0)
      return {
        ...item,
        product,
        unitPrice,
        subtotal,
      }
    })
  }, [orderItems, products])

  const orderTotal = useMemo(
    () => enrichedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [enrichedItems],
  )

  const handleItemChange = (index, field, value) => {
    setOrderItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'quantity' ? Number(value || 0) : value,
            }
          : item,
      ),
    )
  }

  const addOrderItem = () => {
    setOrderItems((prev) => [...prev, { product_id: '', quantity: 1 }])
  }

  const removeOrderItem = (index) => {
    setOrderItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const resetOrderForm = () => {
    setCustomerName('')
    setOrderItems([{ product_id: '', quantity: 1 }])
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validItems = orderItems.filter(
      (item) => item.product_id && Number(item.quantity) > 0,
    )

    if (!customerName.trim()) {
      setError('Customer name is required.')
      return
    }

    if (validItems.length === 0) {
      setError('At least one valid order item is required.')
      return
    }

    setLoading(true)
    try {
      await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customerName,
          items: validItems.map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
          })),
        }),
      })

      setSuccess('Order created successfully.')
      resetOrderForm()
      await Promise.all([loadProducts(), loadOrders()])
      setActiveTab('orders')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openOrderDetails = async (orderId) => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/orders/${orderId}`)
      setSelectedOrder(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmtMoney = (value) => Number(value || 0).toFixed(2)

  return (
    <div className="app">
      <header className="header">
        <h1>Product &amp; Order Management</h1>
        <nav className="tabs">
          <button
            className={activeTab === 'products' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
          <button
            className={activeTab === 'create-order' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('create-order')}
          >
            Create Order
          </button>
          <button
            className={activeTab === 'orders' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
        </nav>
      </header>

      {error && <p className="alert error">{error}</p>}
      {success && <p className="alert success">{success}</p>}

      {activeTab === 'products' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Product Listing</h2>
            <button onClick={loadProducts} disabled={loading}>
              Refresh
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>${fmtMoney(product.price)}</td>
                    <td>{product.stock_quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === 'create-order' && (
        <section className="panel">
          <h2>Create Order</h2>
          <form onSubmit={submitOrder} className="order-form">
            <label htmlFor="customerName">Customer Name</label>
            <input
              id="customerName"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Enter customer name"
            />

            <div className="line-items">
              <h3>Order Items</h3>
              {enrichedItems.map((item, index) => (
                <div className="line-item" key={index}>
                  <select
                    value={item.product_id}
                    onChange={(event) =>
                      handleItemChange(index, 'product_id', event.target.value)
                    }
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option value={product.id} key={product.id}>
                        {product.name} ({product.stock_quantity} in stock)
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                  />

                  <span className="subtotal">Subtotal: ${fmtMoney(item.subtotal)}</span>

                  <button
                    type="button"
                    onClick={() => removeOrderItem(index)}
                    disabled={orderItems.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addOrderItem}>
              Add Item
            </button>

            <div className="total">Total: ${fmtMoney(orderTotal)}</div>

            <button type="submit" disabled={loading}>
              Submit Order
            </button>
          </form>
        </section>
      )}

      {activeTab === 'orders' && (
        <section className="panel">
          <div className="panel-head">
            <h2>Order List</h2>
            <button onClick={loadOrders} disabled={loading}>
              Refresh
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{order.customer_name}</td>
                    <td>{order.status}</td>
                    <td>${fmtMoney(order.total_amount)}</td>
                    <td>
                      <button onClick={() => openOrderDetails(order.id)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {selectedOrder && (
            <div className="details">
              <h3>Order Details #{selectedOrder.id}</h3>
              <p>
                <strong>Customer:</strong> {selectedOrder.customer_name}
              </p>
              <p>
                <strong>Status:</strong> {selectedOrder.status}
              </p>
              <p>
                <strong>Total:</strong> ${fmtMoney(selectedOrder.total_amount)}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrder.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || item.product_id}</td>
                      <td>{item.quantity}</td>
                      <td>${fmtMoney(item.unit_price)}</td>
                      <td>${fmtMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default App
